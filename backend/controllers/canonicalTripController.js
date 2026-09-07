const journeyService = require('../services/journeyService');
const cancellationService = require('../services/cancellationService');
const disputeService = require('../services/disputeService');
const withdrawalService = require('../services/withdrawalService');
const secondaryMarketplaceService = require('../services/secondaryMarketplaceService');
const idempotencyService = require('../services/idempotencyService');
const TripInstance = require('../models/TripInstance');
const PassengerJourney = require('../models/PassengerJourney');

class CanonicalTripController {
  /**
   * Helper to handle idempotency wrapping for mutations
   */
  static async withIdempotency(req, res, endpoint, handler) {
    const idempotencyKey = req.headers['idempotency-key'];
    const userId = req.user?.id || req.user?._id;

    if (idempotencyKey && userId) {
      const lock = await idempotencyService.acquireLock(idempotencyKey, userId, endpoint, req.body);
      if (lock.isDuplicate) {
        if (lock.inFlight) {
          return res.status(409).json({ success: false, error: 'Request in flight. Please retry shortly.' });
        }
        return res.status(lock.cachedResponse.status || 200).json(lock.cachedResponse.body);
      }
    }

    try {
      const result = await handler();
      if (idempotencyKey && userId) {
        await idempotencyService.saveResponse(idempotencyKey, 200, result);
      }
      return res.status(200).json(result);
    } catch (err) {
      if (idempotencyKey) {
        await idempotencyService.releaseLock(idempotencyKey);
      }
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // 1. Book Seat
  static async bookSeat(req, res) {
    await CanonicalTripController.withIdempotency(req, res, '/api/v2/trips/book-seat', async () => {
      const passengerId = req.user?.id || req.user?._id;
      const { tripInstanceId, pickupWaypointIndex, dropoffWaypointIndex, seatsBooked, paymentType, fareAmountMad } = req.body;

      return await journeyService.bookSeat({
        tripInstanceId,
        passengerId,
        pickupWaypointIndex,
        dropoffWaypointIndex,
        seatsBooked,
        paymentType,
        fareAmountMad
      });
    });
  }

  // 2. Driver Arrived
  static async driverArrive(req, res) {
    await CanonicalTripController.withIdempotency(req, res, '/api/v2/trips/driver-arrive', async () => {
      const { journeyId } = req.body;
      const journey = await journeyService.recordDriverArrived(journeyId);
      return { success: true, journey };
    });
  }

  // 3. Board Passenger with OTP
  static async boardPassenger(req, res) {
    await CanonicalTripController.withIdempotency(req, res, '/api/v2/trips/board-passenger', async () => {
      const { journeyId, otp } = req.body;
      const journey = await journeyService.boardPassenger(journeyId, otp);
      return { success: true, journey };
    });
  }

  // 4. Dropoff & Settlement
  static async dropoffPassenger(req, res) {
    await CanonicalTripController.withIdempotency(req, res, '/api/v2/trips/dropoff-passenger', async () => {
      const { journeyId } = req.body;
      return await journeyService.dropoffPassenger(journeyId);
    });
  }

  // 5. Cancel Journey
  static async cancelJourney(req, res) {
    await CanonicalTripController.withIdempotency(req, res, '/api/v2/trips/cancel-journey', async () => {
      const userId = req.user?.id || req.user?._id;
      const { journeyId, reason } = req.body;
      return await cancellationService.cancelJourney(journeyId, userId, reason);
    });
  }

  // 6. Record No-Show
  static async recordNoShow(req, res) {
    await CanonicalTripController.withIdempotency(req, res, '/api/v2/trips/no-show', async () => {
      const driverId = req.user?.id || req.user?._id;
      const { journeyId } = req.body;
      return await cancellationService.recordNoShow(journeyId, driverId);
    });
  }

  // 7. Open Dispute
  static async openDispute(req, res) {
    await CanonicalTripController.withIdempotency(req, res, '/api/v2/trips/dispute', async () => {
      const userId = req.user?.id || req.user?._id;
      const { journeyId, disputeType, reason } = req.body;
      return await journeyService.disputeJourney({ journeyId, initiatedBy: userId, disputeType, reason });
    });
  }

  // 8. Admin Resolve Dispute
  static async resolveDispute(req, res) {
    await CanonicalTripController.withIdempotency(req, res, '/api/v2/trips/dispute/resolve', async () => {
      const adminUserId = req.user?.id || req.user?._id;
      const { disputeId, resolutionType, decisionNotes, refundAmountMad, driverPayoutMad } = req.body;
      return await disputeService.resolveDispute(disputeId, adminUserId, resolutionType, { decisionNotes, refundAmountMad, driverPayoutMad });
    });
  }

  // 9. Request Withdrawal
  static async requestWithdrawal(req, res) {
    await CanonicalTripController.withIdempotency(req, res, '/api/v2/trips/withdraw', async () => {
      const driverId = req.user?.id || req.user?._id;
      const { amountMad, bankDetails } = req.body;
      return await withdrawalService.requestWithdrawal(driverId, amountMad, bankDetails);
    });
  }

  // 10. Secondary Marketplace Accept Offer
  static async acceptOffer(req, res) {
    await CanonicalTripController.withIdempotency(req, res, `/api/v2/offers/${req.params.id}/accept`, async () => {
      const passengerUserId = req.user?.id || req.user?._id;
      return await secondaryMarketplaceService.acceptOffer(req.params.id, passengerUserId);
    });
  }

  // 11. Authoritative Reconnect Sync
  static async getActiveState(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const isDriver = req.user?.role === 'driver';

      if (isDriver) {
        const activeTrip = await TripInstance.findOne({
          driverId: userId,
          status: { $in: ['SCHEDULED', 'EN_ROUTE_TO_ORIGIN', 'IN_PROGRESS', 'STARTED', 'ARRIVED'] }
        }).populate('passengerIds');

        const journeys = activeTrip
          ? await PassengerJourney.find({ tripInstanceId: activeTrip._id, status: { $ne: 'CANCELLED_BY_CLIENT' } })
          : [];

        return res.json({ success: true, role: 'driver', activeTrip, journeys });
      } else {
        const activeJourneys = await PassengerJourney.find({
          passengerId: userId,
          status: { $in: ['BOOKED', 'DRIVER_ARRIVED', 'BOARDED'] }
        }).populate('tripInstanceId');

        return res.json({ success: true, role: 'passenger', activeJourneys });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = CanonicalTripController;
