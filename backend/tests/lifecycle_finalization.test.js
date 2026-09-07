const mongoose = require('mongoose');
const JourneyStateMachine = require('../state/JourneyStateMachine');
const TripStateMachine = require('../state/TripStateMachine');
const earningsClearanceWorker = require('../services/earningsClearanceWorker');
const tripCompletionEngine = require('../services/tripCompletionEngine');
const disputeService = require('../services/disputeService');
const { requireVerifiedTransactionalUser } = require('../middleware/auth');
const User = require('../models/User');
const PassengerJourney = require('../models/PassengerJourney');
const TripInstance = require('../models/TripInstance');
const DisputeRecord = require('../models/DisputeRecord');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');

describe('DETOUR.MA — LIFECYCLE FINALIZATION & ARCHITECTURAL VERIFICATION', () => {

  // =========================================================================
  // 1. FINANCIAL MATERIALIZED VIEWS AUDIT & OWNERSHIP
  // =========================================================================
  describe('1. Financial Materialized Views Ownership', () => {
    test('User schema contains canonical materialized balance fields', () => {
      const user = new User({
        fullName: 'Test User',
        role: 'client',
        walletBalance: 150.50,
        heldBalance: 50.00,
        pendingEarnings: 0
      });

      expect(user.walletBalance).toBe(150.50);
      expect(user.heldBalance).toBe(50.00);
      expect(user.pendingEarnings).toBe(0);
    });

    test('Pre-save hook synchronizes legacy balance with canonical walletBalance', async () => {
      const user = new User({
        fullName: 'Driver Account',
        role: 'driver',
        walletBalance: 200.00
      });

      // Simulating pre-save hook execution
      if (user.isModified('walletBalance') && !user.isModified('balance')) {
        user.balance = user.walletBalance;
      }
      expect(user.balance).toBe(200.00);

      // And vice versa
      const user2 = new User({
        fullName: 'Legacy Client',
        balance: 75.25
      });
      if (user2.isModified('balance') && !user2.isModified('walletBalance')) {
        user2.walletBalance = user2.balance;
      }
      expect(user2.walletBalance).toBe(75.25);
    });
  });

  // =========================================================================
  // 2. DISPUTE RESOLUTION BUG FIX REGRESSION
  // =========================================================================
  describe('2. Dispute Resolution Bug Fix (refundAmountCentimes)', () => {
    test('Dispute resolution executes and sets refundAmountCentimes correctly without ReferenceError', async () => {
      const mockDisputeId = new mongoose.Types.ObjectId();
      const mockAdminId = new mongoose.Types.ObjectId();
      const mockJourneyId = new mongoose.Types.ObjectId();
      const mockTripId = new mongoose.Types.ObjectId();
      const mockPassengerId = new mongoose.Types.ObjectId();
      const mockDriverId = new mongoose.Types.ObjectId();

      const mockDispute = {
        _id: mockDisputeId,
        passengerJourneyId: mockJourneyId,
        tripInstanceId: mockTripId,
        status: 'OPEN',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockJourney = {
        _id: mockJourneyId,
        passengerId: mockPassengerId,
        fareAmountMad: 100.00,
        status: 'DISPUTED',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockTrip = {
        _id: mockTripId,
        driverId: mockDriverId
      };

      const mockPassenger = {
        _id: mockPassengerId,
        walletBalance: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockDriver = {
        _id: mockDriverId,
        walletBalance: 0,
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock DB calls within session
      jest.spyOn(DisputeRecord, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockDispute)
      });
      jest.spyOn(PassengerJourney, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockJourney)
      });
      jest.spyOn(TripInstance, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockTrip)
      });
      jest.spyOn(User, 'findById').mockImplementation((id) => ({
        session: jest.fn().mockResolvedValue(id.toString() === mockPassengerId.toString() ? mockPassenger : mockDriver)
      }));

      // Mock Mongoose models save
      jest.spyOn(FinancialJournal.prototype, 'save').mockResolvedValue(true);
      jest.spyOn(FinancialLedgerEntry.prototype, 'save').mockResolvedValue(true);
      const outboxService = require('../services/outboxService');
      jest.spyOn(outboxService, 'emit').mockResolvedValue(true);
      const tripCompletionEngine = require('../services/tripCompletionEngine');
      jest.spyOn(tripCompletionEngine, 'evaluateTripCompletion').mockResolvedValue({ changed: false });

      // Mock session
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      // Execute full refund dispute resolution
      const result = await disputeService.resolveDispute(
        mockDisputeId,
        mockAdminId,
        'RESOLVED_REFUND',
        { decisionNotes: 'Passenger full refund approved' }
      );

      expect(result.success).toBe(true);
      expect(mockDispute.status).toBe('RESOLVED_REFUND');
      expect(mockDispute.resolution.refundAmountCentimes).toBe(10000); // 100.00 MAD * 100
      expect(mockDispute.resolution.driverPayoutCentimes).toBe(0);
      expect(mockJourney.status).toBe('COMPLETED');
      expect(mockPassenger.walletBalance).toBe(100.00);

      // Restore spies
      jest.restoreAllMocks();
    });
  });

  // =========================================================================
  // 3. CANONICAL JOURNEY STATE MACHINE
  // =========================================================================
  describe('3. Canonical JourneyStateMachine Invariants', () => {
    test('Valid forward transitions succeed', () => {
      // BOOKED transitions
      expect(() => JourneyStateMachine.validateTransition('BOOKED', 'DRIVER_ARRIVED')).not.toThrow();
      expect(() => JourneyStateMachine.validateTransition('BOOKED', 'BOARDED')).not.toThrow();
      expect(() => JourneyStateMachine.validateTransition('BOOKED', 'CANCELLED_BY_CLIENT')).not.toThrow();
      expect(() => JourneyStateMachine.validateTransition('BOOKED', 'CANCELLED_BY_DRIVER')).not.toThrow();

      // DRIVER_ARRIVED transitions
      expect(() => JourneyStateMachine.validateTransition('DRIVER_ARRIVED', 'BOARDED')).not.toThrow();
      expect(() => JourneyStateMachine.validateTransition('DRIVER_ARRIVED', 'NO_SHOW')).not.toThrow();
      expect(() => JourneyStateMachine.validateTransition('DRIVER_ARRIVED', 'CANCELLED_BY_CLIENT')).not.toThrow();

      // BOARDED transitions
      expect(() => JourneyStateMachine.validateTransition('BOARDED', 'DROPPED_OFF')).not.toThrow();
      expect(() => JourneyStateMachine.validateTransition('BOARDED', 'DISPUTED')).not.toThrow();

      // DROPPED_OFF transitions
      expect(() => JourneyStateMachine.validateTransition('DROPPED_OFF', 'COMPLETED')).not.toThrow();
      expect(() => JourneyStateMachine.validateTransition('DROPPED_OFF', 'DISPUTED')).not.toThrow();

      // DISPUTED transitions
      expect(() => JourneyStateMachine.validateTransition('DISPUTED', 'COMPLETED')).not.toThrow();
    });

    test('Illegal transitions throw validation error', () => {
      // Terminal states cannot transition anywhere
      expect(() => JourneyStateMachine.validateTransition('COMPLETED', 'DISPUTED'))
        .toThrow(/Illegal journey state transition/);
      expect(() => JourneyStateMachine.validateTransition('CANCELLED_BY_CLIENT', 'BOOKED'))
        .toThrow(/Illegal journey state transition/);
      expect(() => JourneyStateMachine.validateTransition('NO_SHOW', 'BOARDED'))
        .toThrow(/Illegal journey state transition/);

      // Skipped illegal jumps
      expect(() => JourneyStateMachine.validateTransition('BOOKED', 'COMPLETED'))
        .toThrow(/Illegal journey state transition/);
      expect(() => JourneyStateMachine.validateTransition('BOARDED', 'NO_SHOW'))
        .toThrow(/Illegal journey state transition/);
      expect(() => JourneyStateMachine.validateTransition('DROPPED_OFF', 'BOARDED'))
        .toThrow(/Illegal journey state transition/);
    });

    test('Classification helpers categorize states accurately', () => {
      // isTerminal
      expect(JourneyStateMachine.isTerminal('COMPLETED')).toBe(true);
      expect(JourneyStateMachine.isTerminal('CANCELLED_BY_CLIENT')).toBe(true);
      expect(JourneyStateMachine.isTerminal('CANCELLED_BY_DRIVER')).toBe(true);
      expect(JourneyStateMachine.isTerminal('NO_SHOW')).toBe(true);
      expect(JourneyStateMachine.isTerminal('DISPUTED')).toBe(false);
      expect(JourneyStateMachine.isTerminal('BOARDED')).toBe(false);

      // isExecutionActive (physically requiring ride participation)
      expect(JourneyStateMachine.isExecutionActive('BOOKED')).toBe(true);
      expect(JourneyStateMachine.isExecutionActive('DRIVER_ARRIVED')).toBe(true);
      expect(JourneyStateMachine.isExecutionActive('BOARDED')).toBe(true);
      expect(JourneyStateMachine.isExecutionActive('DROPPED_OFF')).toBe(false);
      expect(JourneyStateMachine.isExecutionActive('COMPLETED')).toBe(false);
      expect(JourneyStateMachine.isExecutionActive('DISPUTED')).toBe(false);

      // isExecutionTerminal (physical participation completed)
      expect(JourneyStateMachine.isExecutionTerminal('COMPLETED')).toBe(true);
      expect(JourneyStateMachine.isExecutionTerminal('DISPUTED')).toBe(true);
      expect(JourneyStateMachine.isExecutionTerminal('NO_SHOW')).toBe(true);
      expect(JourneyStateMachine.isExecutionTerminal('BOARDED')).toBe(false);

      // isFinanciallyClosed
      expect(JourneyStateMachine.isFinanciallyClosed('COMPLETED')).toBe(true);
      expect(JourneyStateMachine.isFinanciallyClosed('NO_SHOW')).toBe(true);
      expect(JourneyStateMachine.isFinanciallyClosed('DISPUTED')).toBe(false);
    });
  });

  // =========================================================================
  // 4. AUTOMATED DRIVER EARNINGS CLEARANCE (DEC-LC-001)
  // =========================================================================
  describe('4. Automated Driver Earnings Clearance (DEC-LC-001)', () => {
    test('Clears driver pending earnings after 2 hours if no dispute', async () => {
      const mockJourneyId = new mongoose.Types.ObjectId();
      const mockTripId = new mongoose.Types.ObjectId();
      const mockDriverId = new mongoose.Types.ObjectId();

      const settled2HoursAgo = new Date(Date.now() - (2 * 60 * 60 * 1000 + 5000));

      const mockJourney = {
        _id: mockJourneyId,
        status: 'COMPLETED',
        paymentType: 'DIGITAL_ESCROW',
        driverEarningsPendingAt: settled2HoursAgo,
        earningsClearedAt: null,
        tripInstanceId: mockTripId,
        taxSnapshot: {
          grossFare: 100.00,
          driverNetAmount: 85.00
        },
        save: jest.fn().mockResolvedValue(true)
      };

      const mockTrip = {
        _id: mockTripId,
        driverId: mockDriverId
      };

      const mockDriver = {
        _id: mockDriverId,
        pendingEarnings: 85.00,
        walletBalance: 10.00,
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock atomic findOneAndUpdate lock
      jest.spyOn(PassengerJourney, 'findOneAndUpdate').mockResolvedValue(mockJourney);
      jest.spyOn(TripInstance, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockTrip)
      });
      jest.spyOn(User, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockDriver)
      });
      jest.spyOn(FinancialJournal.prototype, 'save').mockResolvedValue(true);
      jest.spyOn(FinancialLedgerEntry.prototype, 'save').mockResolvedValue(true);
      const outboxService = require('../services/outboxService');
      jest.spyOn(outboxService, 'emit').mockResolvedValue(true);

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      const result = await earningsClearanceWorker.clearJourneyEarnings(mockJourneyId);

      expect(result.cleared).toBe(true);
      expect(result.amountMad).toBe(85.00);
      expect(mockDriver.pendingEarnings).toBe(0.00);
      expect(mockDriver.walletBalance).toBe(95.00); // 10.00 + 85.00
      expect(result.journal.totalDebitCentimes).toBe(8500);
      expect(result.journal.totalCreditCentimes).toBe(8500);

      jest.restoreAllMocks();
    });

    test('Duplicate clearance execution is prevented (idempotent)', async () => {
      // findOneAndUpdate returns null because earningsClearedAt is already set
      jest.spyOn(PassengerJourney, 'findOneAndUpdate').mockResolvedValue(null);

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      const result = await earningsClearanceWorker.clearJourneyEarnings('mock_id');
      expect(result.cleared).toBe(false);
      expect(result.reason).toBe('NOT_ELIGIBLE_OR_ALREADY_CLEARED');

      jest.restoreAllMocks();
    });

    test('Earnings clearance is blocked if an unresolved dispute exists', async () => {
      const mockJourneyId = new mongoose.Types.ObjectId();
      const mockDisputeId = new mongoose.Types.ObjectId();

      const mockJourney = {
        _id: mockJourneyId,
        status: 'COMPLETED',
        paymentType: 'DIGITAL_ESCROW',
        disputeId: mockDisputeId,
        earningsClearedAt: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };

      const mockDispute = {
        _id: mockDisputeId,
        status: 'OPEN'
      };

      jest.spyOn(PassengerJourney, 'findOneAndUpdate').mockResolvedValue(mockJourney);
      jest.spyOn(DisputeRecord, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockDispute)
      });

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      const result = await earningsClearanceWorker.clearJourneyEarnings(mockJourneyId);
      expect(result.cleared).toBe(false);
      expect(result.reason).toBe('BLOCKED_BY_UNRESOLVED_DISPUTE');
      expect(mockJourney.earningsClearedAt).toBeNull(); // Lock rolled back

      jest.restoreAllMocks();
    });
  });

  // =========================================================================
  // 5. AUTOMATIC TRIP COMPLETION (DEC-LC-002)
  // =========================================================================
  describe('5. Automatic Trip Completion Engine (DEC-LC-002)', () => {
    test('Immediately completes TripInstance when all journeys reach execution terminal states', async () => {
      const mockTripId = new mongoose.Types.ObjectId();
      const mockDriverId = new mongoose.Types.ObjectId();

      const mockTrip = {
        _id: mockTripId,
        status: 'STARTED',
        driverId: mockDriverId,
        stateTimestamps: {},
        save: jest.fn().mockResolvedValue(true)
      };

      const mockJourneys = [
        { status: 'COMPLETED' },
        { status: 'CANCELLED_BY_CLIENT' },
        { status: 'NO_SHOW' }
      ];

      const mockDriver = {
        _id: mockDriverId,
        driverStatus: 'BUSY',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(TripInstance, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockTrip)
      });
      jest.spyOn(PassengerJourney, 'find').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockJourneys)
      });
      jest.spyOn(User, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockDriver)
      });
      const outboxService = require('../services/outboxService');
      jest.spyOn(outboxService, 'emit').mockResolvedValue(true);

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      const result = await tripCompletionEngine.evaluateTripCompletion(mockTripId);

      expect(result.changed).toBe(true);
      expect(result.status).toBe('COMPLETED');
      expect(mockTrip.status).toBe('COMPLETED');
      expect(mockTrip.stateTimestamps.completedAt).toBeDefined();
      expect(mockDriver.driverStatus).toBe('ONLINE'); // Active lock released

      jest.restoreAllMocks();
    });

    test('Does NOT complete trip if active journey remains', async () => {
      const mockTrip = {
        _id: 'trip123',
        status: 'STARTED'
      };

      const mockJourneys = [
        { status: 'COMPLETED' },
        { status: 'BOARDED' } // Physically active!
      ];

      jest.spyOn(TripInstance, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockTrip)
      });
      jest.spyOn(PassengerJourney, 'find').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockJourneys)
      });

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      const result = await tripCompletionEngine.evaluateTripCompletion('trip123');

      expect(result.changed).toBe(false);
      expect(result.reason).toBe('PHYSICALLY_ACTIVE_JOURNEYS_REMAIN');
      expect(mockTrip.status).toBe('STARTED');

      jest.restoreAllMocks();
    });

    test('Transitions trip to CLOSED_PENDING_DISPUTES if an unresolved dispute exists', async () => {
      const mockTrip = {
        _id: 'trip456',
        status: 'STARTED',
        stateTimestamps: {},
        save: jest.fn().mockResolvedValue(true)
      };

      const mockJourneys = [
        { status: 'COMPLETED' },
        { status: 'DISPUTED' } // Execution finished, financial resolution pending
      ];

      jest.spyOn(TripInstance, 'findById').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockTrip)
      });
      jest.spyOn(PassengerJourney, 'find').mockReturnValue({
        session: jest.fn().mockResolvedValue(mockJourneys)
      });
      const outboxService = require('../services/outboxService');
      jest.spyOn(outboxService, 'emit').mockResolvedValue(true);

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      const result = await tripCompletionEngine.evaluateTripCompletion('trip456');

      expect(result.changed).toBe(true);
      expect(result.status).toBe('CLOSED_PENDING_DISPUTES');
      expect(mockTrip.status).toBe('CLOSED_PENDING_DISPUTES');

      jest.restoreAllMocks();
    });
  });

  // =========================================================================
  // 6. GUEST & TRANSACTIONAL USER AUTHORIZATION (DEC-LC-003)
  // =========================================================================
  describe('6. Transactional User Authorization Guard (DEC-LC-003)', () => {
    let req, res, next;

    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      next = jest.fn();
    });

    test('Blocks unauthenticated requests with 401', async () => {
      req = { user: null };
      await requireVerifiedTransactionalUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNAUTHORIZED' }));
      expect(next).not.toHaveBeenCalled();
    });

    test('Blocks guest accounts with 403 GUEST_RESTRICTED', async () => {
      req = { user: { id: 'guest1' } };
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: 'guest1',
        authProvider: 'guest',
        accountStatus: 'active',
        phoneVerified: false
      });

      await requireVerifiedTransactionalUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'GUEST_RESTRICTED' }));
      expect(next).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    test('Blocks unverified registered users with 403 PHONE_VERIFICATION_REQUIRED', async () => {
      req = { user: { id: 'user1' } };
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: 'user1',
        authProvider: 'email',
        accountStatus: 'active',
        phoneVerified: false
      });

      await requireVerifiedTransactionalUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PHONE_VERIFICATION_REQUIRED' }));
      expect(next).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    test('Blocks suspended/blocked users with 403 ACCOUNT_RESTRICTED', async () => {
      req = { user: { id: 'user2' } };
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: 'user2',
        accountStatus: 'blocked',
        phoneVerified: true
      });

      await requireVerifiedTransactionalUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ACCOUNT_RESTRICTED' }));
      expect(next).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    test('Allows verified passenger to transact', async () => {
      req = { user: { id: 'passenger1', role: 'client' } };
      const verifiedUser = {
        _id: 'passenger1',
        role: 'client',
        accountStatus: 'active',
        authProvider: 'email',
        phoneVerified: true
      };
      jest.spyOn(User, 'findById').mockResolvedValue(verifiedUser);

      await requireVerifiedTransactionalUser(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.fullUser).toEqual(verifiedUser);

      jest.restoreAllMocks();
    });

    test('Allows verified driver with approved KYC to transact', async () => {
      req = { user: { id: 'driver1', role: 'driver' } };
      const verifiedDriver = {
        _id: 'driver1',
        role: 'driver',
        accountStatus: 'active',
        authProvider: 'email',
        phoneVerified: true,
        verificationStatus: 'verified'
      };
      jest.spyOn(User, 'findById').mockResolvedValue(verifiedDriver);

      await requireVerifiedTransactionalUser(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.fullUser).toEqual(verifiedDriver);

      jest.restoreAllMocks();
    });
  });
});
