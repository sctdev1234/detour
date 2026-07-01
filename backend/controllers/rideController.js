const rideService = require('../services/rideService');
const AppError = require('../utils/AppError');

exports.createRideRequest = async (req, res, next) => {
    try {
        const request = await rideService.createRideRequest(req.user.id, req.body);
        res.status(201).json({
            status: 'success',
            data: request
        });
    } catch (error) {
        next(error);
    }
};

exports.startSearching = async (req, res, next) => {
    try {
        const result = await rideService.startSearching(req.params.id, req.user.id);
        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

exports.cancelRideRequest = async (req, res, next) => {
    try {
        await rideService.cancelRideRequest(req.params.id, req.user.id);
        res.status(200).json({
            status: 'success',
            message: 'Ride request cancelled'
        });
    } catch (error) {
        next(error);
    }
};

exports.searchNearbyRequests = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.query;
        if (!latitude || !longitude) {
            throw new AppError('Latitude and longitude are required', 400);
        }
        const requests = await rideService.searchNearbyRequests(parseFloat(latitude), parseFloat(longitude));
        res.status(200).json({
            status: 'success',
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

exports.submitOffer = async (req, res, next) => {
    try {
        const offer = await rideService.submitOffer(req.user.id, req.body);
        res.status(201).json({
            status: 'success',
            data: offer
        });
    } catch (error) {
        next(error);
    }
};

exports.acceptOffer = async (req, res, next) => {
    try {
        const trip = await rideService.acceptOffer(req.params.id, req.user.id);
        res.status(200).json({
            status: 'success',
            data: trip
        });
    } catch (error) {
        next(error);
    }
};

exports.rejectOffer = async (req, res, next) => {
    try {
        await rideService.rejectOffer(req.params.id, req.user.id);
        res.status(200).json({
            status: 'success',
            message: 'Offer rejected'
        });
    } catch (error) {
        next(error);
    }
};
