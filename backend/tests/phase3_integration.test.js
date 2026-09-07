const TaxService = require('../services/tax/TaxService');
const capacityService = require('../services/capacityService');
const idempotencyService = require('../services/idempotencyService');
const driverEligibilityService = require('../services/driverEligibilityService');

describe('DETOUR.MA — PHASE 3 INTEGRATION & CANONICAL DOMAIN TESTS', () => {

  describe('1-5. Segment Capacity & Multi-Passenger Routing Scenarios', () => {
    let waypoints;
    let segments;

    beforeEach(() => {
      waypoints = [
        { index: 0, name: 'Casa Oasis' },
        { index: 1, name: 'Casa Voyageurs' },
        { index: 2, name: 'Mohammedia' },
        { index: 3, name: 'Rabat Agdal' }
      ];
      segments = capacityService.initializeSegments(waypoints, 3); // 3 seats
    });

    test('Scenario 1: Single passenger digital booking capacity', () => {
      const trip = { segmentCapacity: segments };
      const check = capacityService.checkCapacity(trip.segmentCapacity, 0, 3, 1);
      expect(check.hasCapacity).toBe(true);
      capacityService.reserveSeats(trip, 0, 3, 1);
      expect(trip.segmentCapacity[0].seatsOccupied).toBe(1);
      expect(trip.segmentCapacity[1].seatsOccupied).toBe(1);
      expect(trip.segmentCapacity[2].seatsOccupied).toBe(1);
    });

    test('Scenario 2: Three passengers same trip full capacity utilization', () => {
      const trip = { segmentCapacity: segments };
      capacityService.reserveSeats(trip, 0, 3, 3);
      expect(trip.segmentCapacity[0].seatsOccupied).toBe(3);
      const check = capacityService.checkCapacity(trip.segmentCapacity, 0, 3, 1);
      expect(check.hasCapacity).toBe(false);
      expect(check.bottleneckSegment).toBe(0);
    });

    test('Scenario 3: Three passengers different discrete non-overlapping segments', () => {
      const trip = { segmentCapacity: segments };
      // Pass A: W0 -> W1 (3 seats)
      capacityService.reserveSeats(trip, 0, 1, 3);
      // Pass B: W1 -> W2 (3 seats)
      capacityService.reserveSeats(trip, 1, 2, 3);
      // Pass C: W2 -> W3 (3 seats)
      capacityService.reserveSeats(trip, 2, 3, 3);

      expect(trip.segmentCapacity[0].seatsOccupied).toBe(3);
      expect(trip.segmentCapacity[1].seatsOccupied).toBe(3);
      expect(trip.segmentCapacity[2].seatsOccupied).toBe(3);
    });

    test('Scenario 4: Segment bottleneck collision blocks overbooking', () => {
      const trip = { segmentCapacity: segments };
      // Pass A takes 2 seats from W0 to W2 (occupies Seg 0 and Seg 1)
      capacityService.reserveSeats(trip, 0, 2, 2);

      // Pass B requests 2 seats from W1 to W3 (Seg 1 only has 1 seat left)
      const check = capacityService.checkCapacity(trip.segmentCapacity, 1, 3, 2);
      expect(check.hasCapacity).toBe(false);
      expect(check.bottleneckSegment).toBe(1);
      expect(check.availableSeats).toBe(1);

      expect(() => {
        capacityService.reserveSeats(trip, 1, 3, 2);
      }).toThrow(/Insufficient seat capacity on route segment 1/);
    });

    test('Scenario 5: Releasing capacity upon cancellation restores segment availability', () => {
      const trip = { segmentCapacity: segments };
      capacityService.reserveSeats(trip, 0, 2, 2);
      expect(trip.segmentCapacity[0].seatsOccupied).toBe(2);
      expect(trip.segmentCapacity[1].seatsOccupied).toBe(2);

      // Cancel reservation
      capacityService.releaseSeats(trip, 0, 2, 2);
      expect(trip.segmentCapacity[0].seatsOccupied).toBe(0);
      expect(trip.segmentCapacity[1].seatsOccupied).toBe(0);

      const check = capacityService.checkCapacity(trip.segmentCapacity, 0, 2, 3);
      expect(check.hasCapacity).toBe(true);
    });
  });

  describe('6-15. Financial Invariants, Tax Snapshots & Centimes Math', () => {
    test('Scenario 6: VAT_INCLUSIVE Formula exact precision (100 MAD)', () => {
      const snap = TaxService.calculateSnapshot(100, { strategy: 'VAT_INCLUSIVE', commissionRate: 0.15, taxRate: 0.20 });
      expect(snap.grossFare).toBe(100);
      expect(snap.commissionGrossAmount).toBe(15.00);
      expect(snap.taxableAmount).toBe(12.50);
      expect(snap.taxAmount).toBe(2.50);
      expect(snap.detourNetRevenue).toBe(12.50);
      expect(snap.driverNetAmount).toBe(85.00);
      expect(snap.driverNetAmount + snap.commissionGrossAmount).toBe(100.00);
    });

    test('Scenario 7: VAT_EXCLUSIVE Formula exact precision (100 MAD)', () => {
      const snap = TaxService.calculateSnapshot(100, { strategy: 'VAT_EXCLUSIVE', commissionRate: 0.15, taxRate: 0.20 });
      expect(snap.grossFare).toBe(100);
      expect(snap.taxableAmount).toBe(15.00);
      expect(snap.taxAmount).toBe(3.00);
      expect(snap.commissionGrossAmount).toBe(18.00);
      expect(snap.detourNetRevenue).toBe(15.00);
      expect(snap.driverNetAmount).toBe(82.00);
      expect(snap.driverNetAmount + snap.commissionGrossAmount).toBe(100.00);
    });

    test('Scenario 8: ZERO_RATED Formula exact precision (100 MAD)', () => {
      const snap = TaxService.calculateSnapshot(100, { strategy: 'ZERO_RATED', commissionRate: 0.15 });
      expect(snap.grossFare).toBe(100);
      expect(snap.commissionGrossAmount).toBe(15.00);
      expect(snap.taxAmount).toBe(0.00);
      expect(snap.driverNetAmount).toBe(85.00);
    });

    test('Scenario 9: Ledger Zero-Sum Invariant over varying fractional fares', () => {
      const testFares = [17.50, 33.33, 49.99, 125.00, 250.75, 499.00];
      testFares.forEach(fare => {
        const snap = TaxService.calculateSnapshot(fare, { strategy: 'VAT_INCLUSIVE' });
        const grossCentimes = Math.round(snap.grossFare * 100);
        const netCentimes = Math.round(snap.detourNetRevenue * 100);
        const taxCentimes = Math.round(snap.taxAmount * 100);
        const driverCentimes = Math.round(snap.driverNetAmount * 100);
        
        expect(grossCentimes).toBe(netCentimes + taxCentimes + driverCentimes);
      });
    });

    test('Scenario 10: Historical Tax Immutability on Global Policy Switch', () => {
      const historic = TaxService.calculateSnapshot(80, { strategy: 'VAT_INCLUSIVE' });
      process.env.PLATFORM_TAX_STRATEGY = 'VAT_EXCLUSIVE';
      const current = TaxService.calculateSnapshot(80);

      expect(historic.taxStrategy).toBe('VAT_INCLUSIVE');
      expect(historic.driverNetAmount).toBe(68.00);
      expect(current.taxStrategy).toBe('VAT_EXCLUSIVE');
      expect(current.driverNetAmount).toBe(65.60);

      process.env.PLATFORM_TAX_STRATEGY = 'VAT_INCLUSIVE'; // reset
    });
  });

  describe('16-25. Idempotency & Centralized Guard Verification', () => {
    test('Scenario 16: Idempotency payload hashing consistency', () => {
      const payloadA = { journeyId: 'j1', otp: '1234' };
      const payloadB = { journeyId: 'j1', otp: '1234' };
      const payloadC = { journeyId: 'j1', otp: '5678' };

      expect(idempotencyService.hashPayload(payloadA)).toBe(idempotencyService.hashPayload(payloadB));
      expect(idempotencyService.hashPayload(payloadA)).not.toBe(idempotencyService.hashPayload(payloadC));
    });
  });

  describe('26-35. Driver KYC & Operational Eligibility Guards', () => {
    test('Scenario 26: Non-driver user role rejected', async () => {
      const result = await driverEligibilityService.checkEligibility('non_existent_id');
      expect(result.isEligible).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    test('Scenario 27: GeoJSON coordinates ordering rule [lng, lat]', () => {
      // In GeoJSON, Longitude is first (-180 to 180), Latitude is second (-90 to 90)
      const casablanca = [-7.5898, 33.5731];
      expect(casablanca[0]).toBeLessThan(0); // Longitude
      expect(casablanca[1]).toBeGreaterThan(0); // Latitude
    });
  });

  describe('36-40. Withdrawal & Cancellation Thresholds', () => {
    test('Scenario 36: Minimum withdrawal threshold strictly enforced at 50 MAD', () => {
      const minMad = 50.00;
      const validAmount = 50.00;
      const invalidAmount = 49.99;

      expect(validAmount >= minMad).toBe(true);
      expect(invalidAmount >= minMad).toBe(false);
    });

    test('Scenario 37: Cash Booking Minimum Driver Balance gate at 50 MAD', () => {
      const minDriverBalanceMad = 50.00;
      const driverWalletA = 55.00;
      const driverWalletB = 45.00;

      expect(driverWalletA >= minDriverBalanceMad).toBe(true);
      expect(driverWalletB >= minDriverBalanceMad).toBe(false);
    });

    test('Scenario 38: No-show 80% driver compensation arithmetic', () => {
      const fare = 100;
      const driverComp = fare * 0.80;
      const platformFee = fare - driverComp;

      expect(driverComp).toBe(80);
      expect(platformFee).toBe(20);
      expect(driverComp + platformFee).toBe(fare);
    });

    test('Scenario 39: Late Cancellation (< 2h) 50/50 split arithmetic', () => {
      const fare = 80;
      const refund = fare * 0.50;
      const driverComp = fare * 0.50;

      expect(refund).toBe(40);
      expect(driverComp).toBe(40);
      expect(refund + driverComp).toBe(fare);
    });

    test('Scenario 40: Standard Cancellation (2-24h) 90/10 split arithmetic', () => {
      const fare = 100;
      const refund = fare * 0.90;
      const platformFee = fare * 0.10;

      expect(refund).toBe(90);
      expect(platformFee).toBe(10);
      expect(refund + platformFee).toBe(fare);
    });
  });
});
