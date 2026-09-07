const User = require('../models/User');

class DriverEligibilityService {
  /**
   * Evaluates if a driver is fully eligible to accept rides, create templates, or be assigned trips.
   * @param {ObjectId} driverId 
   * @returns {Promise<{ isEligible: boolean, reasons: Array<string> }>}
   */
  async checkEligibility(driverId) {
    const mongoose = require('mongoose');
    if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
      return { isEligible: false, reasons: ['Invalid or missing driver ID'] };
    }
    const driver = await User.findById(driverId);
    if (!driver) {
      return { isEligible: false, reasons: ['Driver user account not found'] };
    }

    const reasons = [];

    // Role verification
    if (driver.role !== 'driver') {
      reasons.push('User account role is not driver');
    }

    // Driver KYC Verification Status
    if (driver.driverStatus === 'SUSPENDED' || driver.driverStatus === 'REJECTED') {
      reasons.push(`Driver account is ${driver.driverStatus}`);
    }

    // Onboarding documents check
    const docs = driver.documents || {};
    const hasCin = docs.cin?.status === 'approved' || driver.identityVerified === true;
    const hasPermis = docs.drivingLicense?.status === 'approved' || driver.licenseVerified === true;

    // Check if onboarding status is completed/approved
    const isApproved = driver.onboardingStatus === 'completed' || driver.driverStatus === 'APPROVED' || driver.driverStatus === 'ONLINE' || driver.isDriverVerified === true || driver.verificationStatus === 'verified';

    if (!isApproved && !hasCin && !hasPermis) {
      reasons.push('Mandatory KYC verification (CIN, Permis) is incomplete or not approved');
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
      driver
    };
  }

  /**
   * Enforces that a driver cannot have more than one active running trip.
   */
  async assertSingleActiveTrip(driverId, excludeTripId = null) {
    const TripInstance = require('../models/TripInstance');
    const query = {
      driverId,
      status: { $in: ['EN_ROUTE', 'EN_ROUTE_TO_ORIGIN', 'IN_PROGRESS', 'STARTED'] }
    };

    if (excludeTripId) {
      query._id = { $ne: excludeTripId };
    }

    const activeTrip = await TripInstance.findOne(query);
    if (activeTrip) {
      throw new Error(`Driver ${driverId} already has an active trip in progress (${activeTrip._id})`);
    }
  }
}

module.exports = new DriverEligibilityService();
