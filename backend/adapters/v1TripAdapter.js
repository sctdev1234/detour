const journeyService = require('../services/journeyService');
const TripInstance = require('../models/TripInstance');
const PassengerJourney = require('../models/PassengerJourney');

/**
 * v1TripAdapter
 * Translates legacy V1 HTTP requests into canonical domain commands.
 * Contains ZERO independent business rules. Delegates 100% to canonical domain services.
 */
class V1TripAdapter {
  /**
   * Adapts legacy join request (POST /api/routes/:id/join) to canonical journeyService.bookSeat
   */
  async adaptJoinRequest(legacyRouteId, userId, { seats = 1, paymentType = 'DIGITAL_ESCROW', fareAmountMad }) {
    // Find active TripInstance corresponding to the legacy route
    let trip = await TripInstance.findOne({
      $or: [
        { _id: legacyRouteId },
        { legacyReferenceId: String(legacyRouteId) }
      ]
    });

    if (!trip) {
      throw new Error(`No active TripInstance found for legacy route ${legacyRouteId}`);
    }

    const result = await journeyService.bookSeat({
      tripInstanceId: trip._id,
      passengerId: userId,
      pickupWaypointIndex: 0,
      dropoffWaypointIndex: trip.waypoints ? Math.max(1, trip.waypoints.length - 1) : 1,
      seatsBooked: Number(seats),
      paymentType: paymentType === 'cash' ? 'CASH_ON_BOARDING' : 'DIGITAL_ESCROW',
      fareAmountMad: Number(fareAmountMad || trip.pricingSnapshot?.baseFare || 50)
    });

    // Format response into legacy V1 shape
    return {
      success: true,
      data: {
        joinRequestId: result.journey._id,
        routeId: legacyRouteId,
        status: 'accepted',
        seats: result.journey.seatsBooked,
        otp: result.journey.verificationOtp,
        createdAt: result.journey.createdAt
      }
    };
  }

  /**
   * Adapts legacy client boarding verification to canonical journeyService.boardPassenger
   */
  async adaptVerifyPassenger(journeyId, otp) {
    const journey = await journeyService.boardPassenger(journeyId, otp);
    return {
      success: true,
      message: 'Passenger verified and boarded successfully',
      client: {
        id: journey.passengerId,
        status: 'picked_up',
        boardedAt: journey.boardedAt
      }
    };
  }

  /**
   * Adapts legacy passenger dropoff to canonical journeyService.dropoffPassenger
   */
  async adaptDropoffPassenger(journeyId) {
    const result = await journeyService.dropoffPassenger(journeyId);
    return {
      success: true,
      message: 'Passenger dropped off and payment settled',
      settlement: result.settlement.taxSnapshot
    };
  }
}

module.exports = new V1TripAdapter();
