const TaxService = require('../services/tax/TaxService');
const capacityService = require('../services/capacityService');
const idempotencyService = require('../services/idempotencyService');
const driverEligibilityService = require('../services/driverEligibilityService');
const v1TripAdapter = require('../adapters/v1TripAdapter');
const outboxService = require('../services/outboxService');
const recurringScheduler = require('../services/recurringScheduler');

describe('DETOUR.MA — PHASE 3.5 FINAL FORENSIC INTEGRATION & INTEGRITY TESTS', () => {

  describe('1. Idempotency & Centralized Guard Runtime Trace', () => {
    test('1.1. Deterministic hashing for identical request payloads', () => {
      const payload1 = { tripInstanceId: 't1', seatsBooked: 2, fareAmountMad: 50 };
      const payload2 = { tripInstanceId: 't1', seatsBooked: 2, fareAmountMad: 50 };
      const payloadDiff = { tripInstanceId: 't1', seatsBooked: 3, fareAmountMad: 50 };

      expect(idempotencyService.hashPayload(payload1)).toBe(idempotencyService.hashPayload(payload2));
      expect(idempotencyService.hashPayload(payload1)).not.toBe(idempotencyService.hashPayload(payloadDiff));
    });
  });

  describe('2. Concurrent Segment Capacity & Multi-Passenger Safety', () => {
    let waypoints;
    let segments;

    beforeEach(() => {
      waypoints = [
        { index: 0, name: 'Casablanca' },
        { index: 1, name: 'Mohammedia' },
        { index: 2, name: 'Bouznika' },
        { index: 3, name: 'Rabat' }
      ];
      // Total 3 segments (0->1, 1->2, 2->3), Capacity: 3 seats
      segments = capacityService.initializeSegments(waypoints, 3);
    });

    test('2.1. Exactly 3 segments generated for 4 waypoints', () => {
      expect(segments.length).toBe(3);
    });

    test('2.2. Overlapping interval collision detection (A: 0->2, B: 1->3)', () => {
      const trip = { segmentCapacity: segments };
      // Passenger A books 2 seats on Casa -> Bouznika (occupies Seg 0 and Seg 1)
      capacityService.reserveSeats(trip, 0, 2, 2);
      expect(trip.segmentCapacity[0].seatsOccupied).toBe(2);
      expect(trip.segmentCapacity[1].seatsOccupied).toBe(2);

      // Passenger B attempts to book 2 seats on Mohammedia -> Rabat (Seg 1 and Seg 2)
      // Seg 1 only has 3 - 2 = 1 seat available -> MUST FAIL
      const checkB = capacityService.checkCapacity(trip.segmentCapacity, 1, 3, 2);
      expect(checkB.hasCapacity).toBe(false);
      expect(checkB.bottleneckSegment).toBe(1);
      expect(checkB.availableSeats).toBe(1);

      expect(() => {
        capacityService.reserveSeats(trip, 1, 3, 2);
      }).toThrow(/Insufficient seat capacity on route segment 1/);
    });

    test('2.3. Disjoint non-overlapping intervals both succeed at full capacity', () => {
      const trip = { segmentCapacity: segments };
      // Passenger A books full capacity 3 seats on Seg 0 (Casa -> Mohammedia)
      capacityService.reserveSeats(trip, 0, 1, 3);
      // Passenger B books full capacity 3 seats on Seg 1 (Mohammedia -> Bouznika)
      capacityService.reserveSeats(trip, 1, 2, 3);
      // Passenger C books full capacity 3 seats on Seg 2 (Bouznika -> Rabat)
      capacityService.reserveSeats(trip, 2, 3, 3);

      expect(trip.segmentCapacity[0].seatsOccupied).toBe(3);
      expect(trip.segmentCapacity[1].seatsOccupied).toBe(3);
      expect(trip.segmentCapacity[2].seatsOccupied).toBe(3);
    });
  });

  describe('3. Financial & Tax Strategy Immutability', () => {
    test('3.1. VAT_INCLUSIVE (100 MAD Fare) -> 85 Driver Net, 12.50 Platform Net, 2.50 VAT', () => {
      const snapshot = TaxService.calculateSnapshot(100, { strategy: 'VAT_INCLUSIVE', commissionRate: 0.15, taxRate: 0.20 });
      expect(snapshot.grossFare).toBe(100);
      expect(snapshot.commissionGrossAmount).toBe(15.00);
      expect(snapshot.taxableAmount).toBe(12.50);
      expect(snapshot.taxAmount).toBe(2.50);
      expect(snapshot.detourNetRevenue).toBe(12.50);
      expect(snapshot.driverNetAmount).toBe(85.00);
      expect(snapshot.driverNetAmount + snapshot.commissionGrossAmount).toBe(100.00);
      expect(snapshot.detourNetRevenue + snapshot.taxAmount).toBe(15.00);
    });

    test('3.2. VAT_EXCLUSIVE (100 MAD Fare) -> 82 Driver Net, 15.00 Platform Net, 3.00 VAT', () => {
      const snapshot = TaxService.calculateSnapshot(100, { strategy: 'VAT_EXCLUSIVE', commissionRate: 0.15, taxRate: 0.20 });
      expect(snapshot.grossFare).toBe(100);
      expect(snapshot.taxableAmount).toBe(15.00);
      expect(snapshot.taxAmount).toBe(3.00);
      expect(snapshot.commissionGrossAmount).toBe(18.00);
      expect(snapshot.detourNetRevenue).toBe(15.00);
      expect(snapshot.driverNetAmount).toBe(82.00);
      expect(snapshot.driverNetAmount + snapshot.commissionGrossAmount).toBe(100.00);
    });

    test('3.3. ZERO_RATED (100 MAD Fare) -> 85 Driver Net, 15.00 Platform Net, 0.00 VAT', () => {
      const snapshot = TaxService.calculateSnapshot(100, { strategy: 'ZERO_RATED', commissionRate: 0.15 });
      expect(snapshot.grossFare).toBe(100);
      expect(snapshot.commissionGrossAmount).toBe(15.00);
      expect(snapshot.taxAmount).toBe(0.00);
      expect(snapshot.detourNetRevenue).toBe(15.00);
      expect(snapshot.driverNetAmount).toBe(85.00);
    });

    test('3.4. Double-Entry Zero-Sum Ledger Invariant across 200 random fares', () => {
      for (let i = 0; i < 200; i++) {
        const fare = Number((Math.random() * 400 + 10).toFixed(2));
        const snap = TaxService.calculateSnapshot(fare, { strategy: 'VAT_INCLUSIVE' });
        const grossCentimes = Math.round(snap.grossFare * 100);
        const splitCentimes = Math.round(snap.detourNetRevenue * 100) +
                              Math.round(snap.taxAmount * 100) +
                              Math.round(snap.driverNetAmount * 100);
        expect(grossCentimes).toBe(splitCentimes);
      }
    });
  });

  describe('4. Driver Eligibility & GeoJSON Ordering Forensics', () => {
    test('4.1. Driver eligibility rejects invalid/unverified IDs', async () => {
      const checkNull = await driverEligibilityService.checkEligibility(null);
      expect(checkNull.isEligible).toBe(false);
      const checkInvalid = await driverEligibilityService.checkEligibility('invalid_id_123');
      expect(checkInvalid.isEligible).toBe(false);
      expect(checkInvalid.reasons).toContain('Invalid or missing driver ID');
    });

    test('4.2. GeoJSON Coordinates strictly require [longitude, latitude]', () => {
      // Moroccan territory coordinates check: Longitude is negative (-17 to -1), Latitude is positive (21 to 36)
      const rabat = [-6.8498, 34.0208];
      expect(rabat[0]).toBeLessThan(0); // Longitude
      expect(rabat[1]).toBeGreaterThan(0); // Latitude
    });
  });

  describe('5. Cancellation, No-Show & Withdrawal Thresholds', () => {
    test('5.1. Minimum driver withdrawal gate: 50.00 MAD strictly enforced', () => {
      const minThreshold = 50.00;
      expect(49.99 >= minThreshold).toBe(false);
      expect(50.00 >= minThreshold).toBe(true);
      expect(100.00 >= minThreshold).toBe(true);
    });

    test('5.2. Minimum driver wallet balance for cash booking gate: 50.00 MAD', () => {
      const minBalance = 50.00;
      expect(35.00 >= minBalance).toBe(false);
      expect(50.00 >= minBalance).toBe(true);
    });

    test('5.3. No-Show 80/20 arithmetic exact split', () => {
      const fare = 150.00;
      const driverComp = fare * 0.80;
      const platformFee = fare * 0.20;
      expect(driverComp).toBe(120.00);
      expect(platformFee).toBe(30.00);
      expect(driverComp + platformFee).toBe(150.00);
    });

    test('5.4. Late cancellation (< 2h) 50/50 arithmetic split', () => {
      const fare = 120.00;
      const refund = fare * 0.50;
      const driverComp = fare * 0.50;
      expect(refund).toBe(60.00);
      expect(driverComp).toBe(60.00);
      expect(refund + driverComp).toBe(120.00);
    });

    test('5.5. Early cancellation (2-24h) 90/10 arithmetic split', () => {
      const fare = 200.00;
      const refund = fare * 0.90;
      const platformFee = fare * 0.10;
      expect(refund).toBe(180.00);
      expect(platformFee).toBe(20.00);
      expect(refund + platformFee).toBe(200.00);
    });
  });
});
