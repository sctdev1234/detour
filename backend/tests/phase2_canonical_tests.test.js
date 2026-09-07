const TaxService = require('../services/tax/TaxService');
const capacityService = require('../services/capacityService');
const idempotencyService = require('../services/idempotencyService');

describe('Phase 2 Canonical Architecture & Domain Tests', () => {
  describe('Tax & Commission Engine', () => {
    test('VAT_INCLUSIVE Strategy (100 MAD Fare)', () => {
      const snapshot = TaxService.calculateSnapshot(100, { strategy: 'VAT_INCLUSIVE', commissionRate: 0.15, taxRate: 0.20 });
      expect(snapshot.grossFare).toBe(100);
      expect(snapshot.commissionGrossAmount).toBe(15.00);
      expect(snapshot.taxableAmount).toBe(12.50);
      expect(snapshot.taxAmount).toBe(2.50);
      expect(snapshot.detourNetRevenue).toBe(12.50);
      expect(snapshot.driverNetAmount).toBe(85.00);
      expect(snapshot.driverNetAmount + snapshot.commissionGrossAmount).toBe(100.00);
      expect(snapshot.taxableAmount + snapshot.taxAmount).toBe(snapshot.commissionGrossAmount);
    });

    test('VAT_EXCLUSIVE Strategy (100 MAD Fare)', () => {
      const snapshot = TaxService.calculateSnapshot(100, { strategy: 'VAT_EXCLUSIVE', commissionRate: 0.15, taxRate: 0.20 });
      expect(snapshot.grossFare).toBe(100);
      expect(snapshot.taxableAmount).toBe(15.00);
      expect(snapshot.taxAmount).toBe(3.00);
      expect(snapshot.commissionGrossAmount).toBe(18.00);
      expect(snapshot.detourNetRevenue).toBe(15.00);
      expect(snapshot.driverNetAmount).toBe(82.00);
      expect(snapshot.driverNetAmount + snapshot.commissionGrossAmount).toBe(100.00);
    });

    test('ZERO_RATED Strategy (100 MAD Fare)', () => {
      const snapshot = TaxService.calculateSnapshot(100, { strategy: 'ZERO_RATED', commissionRate: 0.15 });
      expect(snapshot.grossFare).toBe(100);
      expect(snapshot.commissionGrossAmount).toBe(15.00);
      expect(snapshot.taxableAmount).toBe(15.00);
      expect(snapshot.taxAmount).toBe(0.00);
      expect(snapshot.detourNetRevenue).toBe(15.00);
      expect(snapshot.driverNetAmount).toBe(85.00);
    });

    test('Historical Tax Snapshot Immutability', () => {
      const historicalSnapshot = TaxService.calculateSnapshot(100, { strategy: 'VAT_INCLUSIVE' });
      // Simulate environment config changing to VAT_EXCLUSIVE
      process.env.PLATFORM_TAX_STRATEGY = 'VAT_EXCLUSIVE';
      const newSnapshot = TaxService.calculateSnapshot(100);

      expect(historicalSnapshot.taxStrategy).toBe('VAT_INCLUSIVE');
      expect(historicalSnapshot.driverNetAmount).toBe(85.00);
      expect(newSnapshot.taxStrategy).toBe('VAT_EXCLUSIVE');
      expect(newSnapshot.driverNetAmount).toBe(82.00);

      // Restore
      process.env.PLATFORM_TAX_STRATEGY = 'VAT_INCLUSIVE';
    });
  });

  describe('Segment-Level Route Capacity Engine', () => {
    const waypoints = [
      { index: 0, name: 'Casa Oasis' },
      { index: 1, name: 'Casa Voyageurs' },
      { index: 2, name: 'Mohammedia' },
      { index: 3, name: 'Rabat Agdal' }
    ];
    let segments;

    beforeEach(() => {
      segments = capacityService.initializeSegments(waypoints, 3); // 3 seats capacity
    });

    test('Generates N-1 discrete segments', () => {
      expect(segments.length).toBe(3);
      expect(segments[0].fromWaypointIndex).toBe(0);
      expect(segments[0].toWaypointIndex).toBe(1);
      expect(segments[1].fromWaypointIndex).toBe(1);
      expect(segments[1].toWaypointIndex).toBe(2);
      expect(segments[2].fromWaypointIndex).toBe(2);
      expect(segments[2].toWaypointIndex).toBe(3);
    });

    test('Allows non-overlapping bookings on different segments', () => {
      const trip = { segmentCapacity: segments };
      // Passenger 1 books Oasis -> Voyageurs (Segment 0) for 3 seats
      capacityService.reserveSeats(trip, 0, 1, 3);
      expect(trip.segmentCapacity[0].seatsOccupied).toBe(3);
      expect(trip.segmentCapacity[1].seatsOccupied).toBe(0);

      // Passenger 2 books Voyageurs -> Rabat (Segments 1 & 2) for 3 seats
      const checkPass2 = capacityService.checkCapacity(trip.segmentCapacity, 1, 3, 3);
      expect(checkPass2.hasCapacity).toBe(true);

      capacityService.reserveSeats(trip, 1, 3, 3);
      expect(trip.segmentCapacity[1].seatsOccupied).toBe(3);
      expect(trip.segmentCapacity[2].seatsOccupied).toBe(3);
    });

    test('Blocks overbooking on bottleneck segment', () => {
      const trip = { segmentCapacity: segments };
      // Passenger 1 books Oasis -> Mohammedia (Segments 0 & 1) for 2 seats
      capacityService.reserveSeats(trip, 0, 2, 2);

      // Passenger 2 attempts to book Voyageurs -> Rabat (Segments 1 & 2) for 2 seats (Exceeds capacity on Seg 1)
      const check = capacityService.checkCapacity(trip.segmentCapacity, 1, 3, 2);
      expect(check.hasCapacity).toBe(false);
      expect(check.bottleneckSegment).toBe(1);
      expect(check.availableSeats).toBe(1);

      expect(() => {
        capacityService.reserveSeats(trip, 1, 3, 2);
      }).toThrow(/Insufficient seat capacity on route segment 1/);
    });
  });

  describe('Idempotency Service', () => {
    test('Generates deterministic payload hashes', () => {
      const hash1 = idempotencyService.hashPayload({ tripId: '123', seats: 2 });
      const hash2 = idempotencyService.hashPayload({ tripId: '123', seats: 2 });
      const hash3 = idempotencyService.hashPayload({ tripId: '123', seats: 3 });

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('Double-Entry Balance & Settlement Invariants', () => {
    test('Zero-Sum Conservation of Every Centime across 100 random fares', () => {
      for (let i = 0; i < 100; i++) {
        const fare = Math.floor(Math.random() * 500) + 10;
        const snapshotInc = TaxService.calculateSnapshot(fare, { strategy: 'VAT_INCLUSIVE' });
        const grossCentimes = Math.round(snapshotInc.grossFare * 100);
        const splitSumCentimes = Math.round(snapshotInc.detourNetRevenue * 100) +
                                 Math.round(snapshotInc.taxAmount * 100) +
                                 Math.round(snapshotInc.driverNetAmount * 100);
        expect(grossCentimes).toBe(splitSumCentimes);

        const snapshotExc = TaxService.calculateSnapshot(fare, { strategy: 'VAT_EXCLUSIVE' });
        const grossCentimesExc = Math.round(snapshotExc.grossFare * 100);
        const splitSumCentimesExc = Math.round(snapshotExc.detourNetRevenue * 100) +
                                    Math.round(snapshotExc.taxAmount * 100) +
                                    Math.round(snapshotExc.driverNetAmount * 100);
        expect(grossCentimesExc).toBe(splitSumCentimesExc);
      }
    });
  });
});
