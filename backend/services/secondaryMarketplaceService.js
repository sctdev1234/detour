const mongoose = require('mongoose');
const RideRequest = require('../models/RideRequest');
const Offer = require('../models/Offer');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const capacityService = require('./capacityService');
const escrowService = require('./escrowService');
const driverEligibilityService = require('./driverEligibilityService');
const outboxService = require('./outboxService');
const crypto = require('crypto');

class SecondaryMarketplaceService {
  /**
   * Accepts a driver offer on a passenger ride request.
   * Delegates to canonical OfferAcceptanceEngine.
   */
  async acceptOffer(offerId, passengerUserId, options = {}) {
    const OfferAcceptanceEngine = require('./offerAcceptanceEngine');
    const assignment = await OfferAcceptanceEngine.acceptOfferAtomic(offerId, passengerUserId, {
      session: options.session,
      idempotencyKey: options.idempotencyKey,
      endpoint: options.endpoint || '/api/v2/trips/offers/accept'
    });

    return {
      success: true,
      tripInstance: assignment.tripInstance,
      tripAssignment: assignment,
      passengerJourney: assignment.passengerJourney,
      offer: assignment.offer
    };
  }
}

module.exports = new SecondaryMarketplaceService();
