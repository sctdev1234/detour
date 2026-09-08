const mongoose = require('mongoose');
const Route = require('../models/Route');
const tripRepository = require('../repositories/TripRepository');
const JoinRequest = require('../models/JoinRequest');
const userRepository = require('../repositories/UserRepository');
const transactionService = require('./transactionService');
const ShadowValidator = require('../utils/ShadowValidator');

class TripService {
    constructor() {
        this.io = null;
        this.calculateDistance = this.calculateDistance.bind(this);
    }

    setIO(io) {
        this.io = io;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
    async createRoute(userId, routeData) {
        const {
            role, carId, startPoint, endPoint, waypoints,
            routeGeometry, price, priceType, days,
            timeStart, timeArrival, distanceKm, estimatedDurationMin
        } = routeData;

        const formattedStart = {
            type: 'Point',
            coordinates: [startPoint.longitude, startPoint.latitude],
            address: startPoint.address
        };

        const formattedEnd = {
            type: 'Point',
            coordinates: [endPoint.longitude, endPoint.latitude],
            address: endPoint.address
        };

        const formattedWaypoints = (waypoints || []).map(wp => ({
            type: 'Point',
            coordinates: [wp.longitude, wp.latitude],
            address: wp.address
        }));

        const newRoute = new Route({
            userId,
            role,
            carId: role === 'driver' ? carId : undefined,
            startPoint: formattedStart,
            endPoint: formattedEnd,
            waypoints: formattedWaypoints,
            routeGeometry,
            schedule: {
                days: days || [],
                time: timeStart || '',
                timeArrival: timeArrival || ''
            },
            distanceKm,
            estimatedDurationMin,
            price: {
                amount: price || 0,
                type: priceType || 'fix'
            },
            status: role === 'driver' ? 'active' : 'pending'
        });

        const savedRoute = await newRoute.save();

        // If Driver created a route, automatically create an empty Trip
        if (role === 'driver') {
            const newTrip = new tripRepository.model({
                driverId: userId,
                routeId: savedRoute._id,
                status: 'PENDING'
            });
            await newTrip.save();
        }

        return savedRoute;
    }

    async getRoutes(userId) {
        return await Route.find({
            userId,
            status: { $ne: 'inactive' }
        }).sort({ createdAt: -1 });
    }

    async deleteRoute(userId, routeId) {
        const route = await Route.findById(routeId);
        if (!route) throw new Error('Route not found');
        if (route.userId.toString() !== userId) throw new Error('Not authorized');

        await route.deleteOne();

        // Also clean up associated Trips if it was a driver route
        if (route.role === 'driver') {
            await tripRepository.model.deleteMany({ routeId: route._id });
        }

        return { msg: 'Route removed' };
    }

    async searchMatches(originId, role = 'client', requestingUserId = null) {
        const route = await Route.findById(originId);
        if (!route) {
            const err = new Error('Route not found');
            err.statusCode = 404;
            throw err;
        }

        // Authorization check: route must belong to authenticated requester if specified
        if (requestingUserId && route.userId && route.userId.toString() !== requestingUserId.toString()) {
            const err = new Error('Unauthorized route access');
            err.statusCode = 403;
            throw err;
        }

        const effectiveRole = route.role || role;
        const { isRouteCompatible } = require('../utils/corridorMatcher');
        const capacityService = require('./capacityService');
        const driverEligibilityService = require('./driverEligibilityService');

        // Helper: verify schedule / expiration compatibility
        const isScheduleCompatible = (dRoute, pReq) => {
            if (pReq.expiresAt && new Date() > new Date(pReq.expiresAt)) {
                return false;
            }
            if (pReq.status === 'CANCELLED' || pReq.isDeleted === true) {
                return false;
            }
            // If it's an immediate on-demand trip instance without a scheduled time
            if (pReq.isTripInstance && !pReq.schedule?.time) {
                return true;
            }
            const driverTime = dRoute.schedule?.time;
            const passTime = pReq.schedule?.time;
            if (driverTime && passTime) {
                const [dh, dm] = driverTime.split(':').map(Number);
                const [ph, pm] = passTime.split(':').map(Number);
                if (!isNaN(dh) && !isNaN(ph)) {
                    const diffMin = Math.abs((dh * 60 + dm) - (ph * 60 + pm));
                    if (diffMin > 120) return false;
                }
            }
            const driverDate = dRoute.date || dRoute.scheduledTime;
            const passDate = pReq.scheduledDeparture || pReq.scheduledTime;
            if (driverDate && passDate) {
                const diffHours = Math.abs(new Date(driverDate).getTime() - new Date(passDate).getTime()) / 3600000;
                if (diffHours > 2) return false;
            }
            return true;
        };

        // Logic for Drivers searching Clients
        if (effectiveRole === 'driver') {
            // Driver must be online & eligible
            if (requestingUserId) {
                const User = require('../models/User');
                const driverUser = await User.findById(requestingUserId).select('driverStatus role');
                if (!driverUser || driverUser.driverStatus !== 'ONLINE') {
                    return [];
                }
                const eligibility = await driverEligibilityService.checkEligibility(requestingUserId);
                if (!eligibility.isEligible) {
                    return [];
                }
                try {
                    await driverEligibilityService.assertSingleActiveTrip(requestingUserId);
                } catch (e) {
                    return [];
                }
            }

            if (route.status === 'inactive' || route.isDeleted) {
                return [];
            }
            if (route.status === 'pending') {
                route.status = 'active';
                await route.save();
            }

            // Check existing trip and seat capacity
            let trip = await tripRepository.findOne({ routeId: originId, status: { $ne: 'completed' } });
            if (!trip) {
                trip = await tripRepository.create({
                    routeId: route._id,
                    driverId: route.userId,
                    carId: route.carId,
                    date: new Date(),
                    seatsAvailable: route.seatsTotal || 4,
                    status: 'MATCHING',
                    clients: []
                });
            }

            if (trip.seatsAvailable <= 0) {
                return [];
            }

            // Find candidate client routes
            const clientRoutes = await Route.find({
                role: 'client',
                status: { $in: ['pending', 'active', 'searching'] },
                isDeleted: { $ne: true },
                userId: { $ne: route.userId }
            }).populate('userId', 'fullName email photoURL phone').lean();

            // Find candidate TripInstances (V2)
            let instanceCandidates = [];
            try {
                const TripInstance = require('../models/TripInstance');
                const activeInstances = await TripInstance.find({
                    status: { $in: ['SEARCHING', 'OFFERS_OPEN'] }
                }).populate('passengerIds', 'fullName email photoURL phone').lean();

                const existingRouteIds = new Set(
                    clientRoutes.map(m => m._id.toString())
                );

                instanceCandidates = activeInstances
                    .filter(inst => {
                        const pId = inst.passengerIds?.[0]?._id?.toString() || inst.passengerIds?.[0]?.toString();
                        if (!pId || pId === route.userId.toString()) return false;
                        const cRouteId = inst.metadata?.clientRouteId || (inst.metadata?.get && inst.metadata.get('clientRouteId'));
                        if (cRouteId && existingRouteIds.has(cRouteId.toString())) return false;
                        return true;
                    })
                    .map(inst => ({
                        _id: inst._id,
                        userId: inst.passengerIds[0],
                        role: 'client',
                        startPoint: inst.pickup,
                        endPoint: inst.destination,
                        price: { amount: inst.pricingSnapshot?.baseFare || 15, type: 'fix' },
                        status: 'searching',
                        isTripInstance: true
                    }));
            } catch (err) {
                console.warn('[searchMatches] Error querying TripInstances:', err.message);
            }

            const allCandidates = [...clientRoutes, ...instanceCandidates];

            // Canonical Route Corridor, Directionality, Schedule and Capacity Verification
            const verifiedMatches = [];
            for (const candidate of allCandidates) {
                // 1. Schedule compatibility
                if (!isScheduleCompatible(route, candidate)) continue;

                // 2. Corridor & Directionality compatibility (<= 25 km regional corridor tolerance)
                const matchResult = isRouteCompatible(route, candidate, { maxCorridorMeters: 25000 });
                if (!matchResult.matched) continue;

                // 3. Segment Capacity compatibility
                const seatsRequested = candidate.requestedSeats || candidate.seats || 1;
                if (trip.segmentCapacity && trip.segmentCapacity.length > 0) {
                    const fromIdx = matchResult.pickupSegmentIndex !== undefined ? matchResult.pickupSegmentIndex : 0;
                    const toIdx = matchResult.dropoffSegmentIndex !== undefined ? (matchResult.dropoffSegmentIndex + 1) : 1;
                    const capRes = capacityService.checkCapacity(trip.segmentCapacity, fromIdx, toIdx, seatsRequested);
                    if (!capRes.hasCapacity) continue;
                } else if (trip.seatsAvailable !== undefined && trip.seatsAvailable < seatsRequested) {
                    continue;
                }

                verifiedMatches.push({ candidate, matchResult });
            }

            // Check existing JoinRequests for these matched clients
            let requestMap = {};
            if (trip && trip._id && mongoose.connection && mongoose.connection.readyState === 1) {
                const requests = await JoinRequest.find({ tripId: trip._id });
                requestMap = requests.reduce((acc, req) => {
                    acc[req.clientRouteId ? req.clientRouteId.toString() : ''] = req.status;
                    return acc;
                }, {});
            }

            // Check active canonical Offers for these matched clients
            if (mongoose.connection && mongoose.connection.readyState === 1) {
                try {
                    const Offer = require('../models/Offer');
                    const activeOffers = await Offer.find({
                        driverId: route.userId,
                        status: { $in: ['DRIVER_PROPOSED', 'PENDING', 'ACCEPTED'] },
                        expiresAt: { $gt: new Date() }
                    }).lean();

                    for (const off of activeOffers) {
                        if (off.tripInstanceId) {
                            requestMap[off.tripInstanceId.toString()] = off.status;
                        }
                        const cRouteId = off.metadata && (off.metadata.clientRouteId || (off.metadata.get && off.metadata.get('clientRouteId')));
                        if (cRouteId) {
                            requestMap[cRouteId.toString()] = off.status;
                        }
                        if (off.passengerId) {
                            requestMap[off.passengerId.toString()] = off.status;
                        }
                    }
                } catch (offerErr) {
                    console.warn('[searchMatches] Error querying active offers for requestMap:', offerErr.message);
                }
            }

            return verifiedMatches.map(({ candidate: clientRoute, matchResult }) => {
                const cId = clientRoute._id ? clientRoute._id.toString() : '';
                const pickupCoord = clientRoute.startPoint || clientRoute.pickup;
                const destCoord = clientRoute.endPoint || clientRoute.destination;
                const fare = clientRoute.price?.amount || clientRoute.price || 15;
                const seats = clientRoute.requestedSeats || clientRoute.seats || 1;
                const pId = clientRoute.userId?._id ? clientRoute.userId._id.toString() : (clientRoute.userId?.toString() || '');

                return {
                    requestId: cId,
                    passengerId: pId,
                    pickup: pickupCoord,
                    destination: destCoord,
                    fare,
                    seatCount: seats,
                    route: clientRoute,
                    tripId: trip?._id || null,
                    requestStatus: requestMap[cId] || null,
                    match: {
                        verified: true,
                        pickupDistanceMeters: matchResult.pickupDistanceMeters,
                        dropoffDistanceMeters: matchResult.dropoffDistanceMeters,
                        pickupSegmentIndex: matchResult.pickupSegmentIndex,
                        dropoffSegmentIndex: matchResult.dropoffSegmentIndex,
                        detourKm: matchResult.detourKm,
                        detourMinutes: matchResult.estimatedDetourMinutes,
                        passengerRideKm: matchResult.passengerRideKm
                    }
                };
            });
        }

        // Logic for Clients searching Drivers
        const driverRoutes = await Route.find({
            role: 'driver',
            status: 'active',
            isDeleted: { $ne: true },
            userId: { $ne: route.userId }
        }).populate('userId', 'fullName email photoURL phone').lean();

        // Check each driver route to verify if client fits along driver route corridor
        const matchingDriverRoutes = [];
        for (const dRoute of driverRoutes) {
            if (!isScheduleCompatible(dRoute, route)) continue;
            const matchResult = isRouteCompatible(dRoute, route, { maxCorridorMeters: 25000 });
            if (matchResult.matched) {
                matchingDriverRoutes.push({ dRoute, matchResult });
            }
        }

        const routeIds = matchingDriverRoutes.map(m => m.dRoute._id);
        const trips = await tripRepository.find({
            routeId: { $in: routeIds },
            status: { $ne: 'completed' },
            seatsAvailable: { $gt: 0 }
        });

        const tripMap = trips.reduce((acc, trip) => {
            acc[trip.routeId.toString()] = trip;
            return acc;
        }, {});

        const requests = await JoinRequest.find({ clientRouteId: originId });
        const requestMap = requests.reduce((acc, req) => {
            acc[req.tripId.toString()] = req.status;
            return acc;
        }, {});

        return matchingDriverRoutes
            .filter(({ dRoute }) => tripMap[dRoute._id.toString()])
            .map(({ dRoute, matchResult }) => {
                const trip = tripMap[dRoute._id.toString()] || null;
                const dId = dRoute.userId?._id ? dRoute.userId._id.toString() : (dRoute.userId?.toString() || '');
                return {
                    requestId: dRoute._id.toString(),
                    driverId: dId,
                    route: dRoute,
                    trip,
                    requestStatus: trip ? requestMap[trip._id.toString()] : null,
                    match: {
                        verified: true,
                        pickupDistanceMeters: matchResult.pickupDistanceMeters,
                        dropoffDistanceMeters: matchResult.dropoffDistanceMeters,
                        pickupSegmentIndex: matchResult.pickupSegmentIndex,
                        dropoffSegmentIndex: matchResult.dropoffSegmentIndex
                    }
                };
            });
    }

    async sendJoinRequest(senderId, { clientRouteId, tripId, proposedPrice }) {
        const sender = await userRepository.findById(senderId);
        if (!sender) throw new Error('User not found');

        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        let clientId, initiatedBy;

        if (trip.driverId.toString() === senderId) {
            // Sender is Driver
            initiatedBy = 'driver';
            // Find clientId from clientRouteId or TripInstance
            const clientRoute = await Route.findById(clientRouteId);
            if (!clientRoute) {
                const TripInstance = require('../models/TripInstance');
                const inst = await TripInstance.findById(clientRouteId);
                if (inst && inst.passengerIds?.length) {
                    clientId = inst.passengerIds[0];
                } else {
                    throw new Error('Client route not found');
                }
            } else {
                clientId = clientRoute.userId;
            }
        } else {
            // Sender is Client (Legacy)
            initiatedBy = 'client';
            clientId = senderId;
        }

        const existingRequest = await JoinRequest.findOne({
            clientId,
            tripId,
            clientRouteId
        });

        if (existingRequest) {
            if (existingRequest.status === 'rejected' && initiatedBy === 'driver') {
                // Driver re-sending request
                existingRequest.status = 'pending';
                existingRequest.proposedPrice = proposedPrice;
                existingRequest.initiatedBy = 'driver';
                await existingRequest.save();
                return existingRequest;
            }
            if (existingRequest.status === 'pending') {
                throw new Error('Request already sent');
            }
            // If accepted, already joined?
        }

        const joinRequest = new JoinRequest({
            clientId,
            clientRouteId,
            tripId,
            status: 'pending',
            initiatedBy,
            proposedPrice
        });

        await joinRequest.save();

        // Canonical V2 Bridge: If driver invited passenger, create canonical Offer and emit to passenger
        if (initiatedBy === 'driver') {
            try {
                const TripInstance = require('../models/TripInstance');
                const Offer = require('../models/Offer');
                const NotificationService = require('./notificationService');

                const clientInstance = await TripInstance.findOne({
                    passengerIds: clientId,
                    status: { $in: ['SEARCHING', 'OFFERS_OPEN'] }
                }).sort({ createdAt: -1 });

                if (clientInstance) {
                    const existingOffer = await Offer.findOne({
                        tripInstanceId: clientInstance._id,
                        driverId: senderId,
                        status: { $in: ['PENDING', 'DRIVER_PROPOSED'] }
                    });

                    if (!existingOffer) {
                        const offer = new Offer({
                            tripInstanceId: clientInstance._id,
                            driverId: senderId,
                            passengerId: clientId,
                            price: proposedPrice || 15,
                            expiresAt: new Date(Date.now() + 120000),
                            status: 'DRIVER_PROPOSED'
                        });
                        await offer.save();

                        const populatedOffer = await Offer.findById(offer._id)
                            .populate('driverId', 'fullName photoURL rating vehicle phone')
                            .lean();

                        NotificationService.emitToPassenger(clientId, 'dispatch:offer_received', {
                            ...populatedOffer,
                            price: offer.price
                        });
                    }
                }
            } catch (bridgeErr) {
                console.error('[TripService] Error creating canonical offer bridge:', bridgeErr);
            }
        } else if (initiatedBy === 'client') {
            // Canonical V2 Bridge: Client requested to join driver trip
            try {
                const TripInstance = require('../models/TripInstance');
                const Offer = require('../models/Offer');

                const clientInstance = await TripInstance.findOne({
                    passengerIds: clientId,
                    status: { $in: ['SEARCHING', 'OFFERS_OPEN', 'DRAFT'] }
                }).sort({ createdAt: -1 });

                if (clientInstance && trip.driverId) {
                    const existingOffer = await Offer.findOne({
                        tripInstanceId: clientInstance._id,
                        driverId: trip.driverId,
                        status: { $in: ['PENDING', 'DRIVER_PROPOSED'] }
                    });

                    if (!existingOffer) {
                        const offer = new Offer({
                            tripInstanceId: clientInstance._id,
                            driverId: trip.driverId,
                            passengerId: clientId,
                            price: proposedPrice || 15,
                            expiresAt: new Date(Date.now() + 120000),
                            status: 'PENDING'
                        });
                        await offer.save();
                    }
                }
            } catch (bridgeErr) {
                console.error('[TripService] Error bridging client join request to canonical Offer:', bridgeErr);
            }
        }

        return joinRequest;
    }

    async handleJoinRequest(userId, { requestId, status }) {
        const joinRequest = await JoinRequest.findById(requestId).populate('tripId');
        if (!joinRequest) throw new Error('Request not found');

        const trip = joinRequest.tripId;
        const isDriver = trip.driverId.toString() === userId;
        const isClient = joinRequest.clientId.toString() === userId;

        if (!isDriver && !isClient) {
            throw new Error('Not authorized');
        }

        // Logic check:
        // If initiatedBy 'driver', then Client accepts/rejects
        // If initiatedBy 'client', then Driver accepts/rejects

        if (joinRequest.initiatedBy === 'driver' && isDriver) {
            // Driver cannot accept their own request, they sent it.
            throw new Error('Waiting for client response');
        }
        if (joinRequest.initiatedBy === 'client' && isClient) {
            throw new Error('Waiting for driver response');
        }

        joinRequest.status = status;
        await joinRequest.save();

        if (status === 'accepted') {
            // Canonical Lifecycle Gate: Route through atomic OfferAcceptanceEngine
            const Offer = require('../models/Offer');
            const offerAcceptanceEngine = require('./offerAcceptanceEngine');
            const TripInstance = require('../models/TripInstance');

            let offer = await Offer.findOne({
                passengerId: joinRequest.clientId,
                status: { $in: ['PENDING', 'DRIVER_PROPOSED'] }
            }).sort({ createdAt: -1 });

            if (offer) {
                await offerAcceptanceEngine.acceptOfferAtomic(offer._id, joinRequest.clientId);
            } else {
                const clientInstance = await TripInstance.findOne({
                    passengerIds: joinRequest.clientId,
                    status: { $in: ['SEARCHING', 'OFFERS_OPEN', 'DRAFT'] }
                }).sort({ createdAt: -1 });

                if (clientInstance && trip && trip.driverId) {
                    offer = new Offer({
                        tripInstanceId: clientInstance._id,
                        driverId: trip.driverId,
                        passengerId: joinRequest.clientId,
                        price: joinRequest.proposedPrice || 15,
                        expiresAt: new Date(Date.now() + 120000),
                        status: 'DRIVER_PROPOSED'
                    });
                    await offer.save();
                    await offerAcceptanceEngine.acceptOfferAtomic(offer._id, joinRequest.clientId);
                } else {
                    throw new Error('Direct booking via legacy JoinRequest is deprecated. Bookings must flow through canonical Offer acceptance.');
                }
            }

            // Sync legacy read-only mirror on Trip for backwards-compatible views
            const Trip = require('../models/Trip');
            await Trip.findByIdAndUpdate(trip._id, {
                $push: {
                    clients: {
                        userId: joinRequest.clientId,
                        routeId: joinRequest.clientRouteId,
                        price: joinRequest.proposedPrice
                    }
                }
            });

            // Auto-reject all other pending requests for this client route
            await JoinRequest.updateMany(
                {
                    clientRouteId: joinRequest.clientRouteId,
                    _id: { $ne: joinRequest._id },
                    status: 'pending'
                },
                { status: 'rejected' }
            );

            await Route.findByIdAndUpdate(joinRequest.clientRouteId, { status: 'inactive' });

            const clientsCount = (trip.clients?.length || 0) + 1;
            let newTripStatus = 'PARTIAL';
            if (clientsCount >= 4) {
                newTripStatus = 'CONFIRMED';
            }
            if (trip.status !== 'STARTED' && trip.status !== 'IN_PROGRESS' && trip.status !== 'COMPLETED') {
                await Trip.findByIdAndUpdate(trip._id, { status: newTripStatus });
            }
        } else if (status === 'rejected') {
            const Offer = require('../models/Offer');
            await Offer.updateMany(
                {
                    passengerId: joinRequest.clientId,
                    status: { $in: ['PENDING', 'DRIVER_PROPOSED'] }
                },
                { $set: { status: 'REJECTED' } }
            );
        }

        return joinRequest;
    }

    async getTrips(userId) {
        // V2 Migration: Pull from TripInstance instead of legacy Trip
        const TripInstance = require('../models/TripInstance');
        const TripAssignment = require('../models/TripAssignment');

        // Find assignments for this driver
        const driverAssignments = await TripAssignment.find({ driverId: userId });
        const assignmentIds = driverAssignments.map(a => a._id);

        const instances = await TripInstance.find({
            $or: [
                { assignmentId: { $in: assignmentIds } },
                { passengerIds: userId }
            ]
        })
        .populate('assignmentId')
        .populate('passengerIds', 'fullName photoURL')
        .sort({ createdAt: -1 });

        // Map V2 TripInstance to legacy Trip shape so frontend History renders without breaking
        return instances.map(instance => {
            const assignment = instance.assignmentId;
            return {
                _id: instance._id,
                driverId: assignment ? assignment.driverId : null,
                status: instance.status,
                createdAt: instance.createdAt,
                routeId: {
                    _id: instance.templateId || instance._id,
                    userId: assignment ? assignment.driverId : null,
                    startPoint: {
                        coordinates: instance.pickup?.coordinates || [0, 0],
                        address: instance.pickup?.address || ''
                    },
                    endPoint: {
                        coordinates: instance.destination?.coordinates || [0, 0],
                        address: instance.destination?.address || ''
                    },
                    price: { amount: instance.pricing?.finalPrice || 0, type: 'fix' },
                    distanceKm: instance.distanceMeters ? instance.distanceMeters / 1000 : 0,
                    estimatedDurationMin: instance.durationSeconds ? Math.floor(instance.durationSeconds / 60) : 0,
                    status: instance.status
                },
                clients: instance.passengerIds.map(p => ({
                    userId: p,
                    status: instance.status === 'COMPLETED' ? 'COMPLETED' : 'WAITING',
                    routeId: {
                        startPoint: {
                            coordinates: instance.pickup?.coordinates || [0, 0],
                            address: instance.pickup?.address || ''
                        },
                        endPoint: {
                            coordinates: instance.destination?.coordinates || [0, 0],
                            address: instance.destination?.address || ''
                        }
                    }
                }))
            };
        });
    }

    async getDriverRequests(userId) {
        const trips = await tripRepository.find({ driverId: userId });
        const tripIds = trips.map(t => t._id);

        return await JoinRequest.find({ tripId: { $in: tripIds }, status: 'pending' })
            .populate('clientId', 'fullName photoURL')
            .populate('clientRouteId')
            .populate('tripId');
    }

    async getClientRequests(userId) {
        return await JoinRequest.find({ clientId: userId })
            .populate('clientRouteId')
            .populate({
                path: 'tripId',
                populate: [
                    { path: 'driverId', select: 'fullName photoURL' },
                    { path: 'routeId' },
                    {
                        path: 'clients.routeId',
                        model: 'Route',
                        select: 'routeGeometry startPoint endPoint' // Explicitly select geometry
                    },
                    {
                        path: 'clients.userId',
                        select: 'fullName photoURL'
                    }
                ]
            })
            .sort({ createdAt: -1 });
    }

    async driverConfirmReady(userId, tripId) {
        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');
        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        if (trip.status !== 'STARTING_SOON') {
            throw new Error(`Cannot confirm ready from state: ${trip.status}`);
        }

        trip.driverReady = true;
        await trip.save();

        if (this.io) {
            this.io.to(`trip:${tripId}`).emit('trip_updated', { tripId });
        }
        return trip;
    }

    async clientConfirmReady(userId, tripId) {
        const trip = await tripRepository.model.findOneAndUpdate(
            { 
                _id: tripId, 
                status: { $in: ['STARTING_SOON', 'CONFIRMED', 'PARTIAL'] },
                clients: { $elemMatch: { userId: userId, status: 'WAITING' } }
            },
            {
                $set: { 'clients.$.status': 'READY' }
            },
            { new: true }
        );

        if (!trip) throw new Error('Trip not found or invalid state transition');

        if (this.io) {
            this.io.to(`trip:${tripId}`).emit('trip_updated', { tripId });
            this.io.to(`user:${trip.driverId}`).emit('client_ready', { tripId, clientId: userId });
        }
        return trip;
    }

    async cancelTrip(userId, { tripId, reason }) {
        const session = await tripRepository.model.startSession();
        session.startTransaction();

        try {
            const trip = await tripRepository.findById(tripId).session(session);
            if (!trip) throw new Error('Trip not found');

            const isDriver = trip.driverId.toString() === userId;
            const isClient = trip.clients.some(c => c.userId.toString() === userId);

            if (!isDriver && !isClient) throw new Error('Not authorized to cancel this trip');

            if (isDriver) {
                trip.status = 'CANCELLED';
                trip.cancellationReason = reason || 'Cancelled by driver';
                trip.cancelledBy = userId;
                trip.stateTimestamps = trip.stateTimestamps || {};
                trip.stateTimestamps.cancelledAt = new Date();

                // Mark all clients as cancelled
                trip.clients.forEach(c => {
                    c.status = 'CANCELLED';
                });

                await trip.save({ session });
                
                // [Phase 5: Parallel Validation]
                ShadowValidator.validateStateTransition(trip, 'CANCELLED');
                
                const analyticsService = require('./analyticsService');
                await analyticsService.logTripCompletion(userId, true); // true for cancelled

                if (this.io) {
                    this.io.to(`trip:${tripId}`).emit('trip_cancelled', { tripId, reason, cancelledBy: 'Driver', cancelledAt: trip.stateTimestamps.cancelledAt });
                }
            } else if (isClient) {
                // Client cancelling their seat
                const clientIndex = trip.clients.findIndex(c => c.userId.toString() === userId);
                if (clientIndex === -1) throw new Error('Client not found');

                trip.clients[clientIndex].status = 'CANCELLED';

                // Refund logic could go here if payment was authorized/hold

                await trip.save({ session });

                if (this.io) {
                    this.io.to(`user:${trip.driverId}`).emit('client_cancelled', { tripId, clientId: userId, reason });
                }
            }

            await session.commitTransaction();
            session.endSession();

            return trip;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    async startTrip(userId, tripId) {
        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        if (trip.status !== 'CONFIRMED' && trip.status !== 'PARTIAL' && trip.status !== 'STARTING_SOON') {
            throw new Error(`Invalid Transition: Cannot start trip from state ${trip.status}`);
        }

        if (trip.status === 'STARTING_SOON' && !trip.driverReady) {
            throw new Error(`Invalid Transition: You must confirm you are ready before starting the trip.`);
        }

        const LegacyRouteStateMachine = require('../state/LegacyRouteStateMachine');
        LegacyRouteStateMachine.validateTransition(trip.status, 'STARTED');
        trip.status = 'STARTED';
        trip.stateTimestamps = trip.stateTimestamps || {};
        trip.stateTimestamps.startedAt = new Date();
        await trip.save();

        // [Phase 5: Parallel Validation]
        ShadowValidator.validateStateTransition(trip, 'STARTED');

        if (this.io) {
            this.io.to(`trip:${tripId}`).emit('trip_started', { tripId, startedAt: trip.stateTimestamps.startedAt });
            this.io.to(`user:${userId}`).emit('trip_updated', { tripId });
        }

        return trip;
    }

    async completeTrip(userId, tripId) {
        const TripInstance = require('../models/TripInstance');
        const instance = await TripInstance.findById(tripId);
        if (instance) {
            throw new Error('Direct completion of TripInstance is forbidden. Trip completion is derived from PassengerJourney state.');
        }

        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        if (trip.status !== 'IN_PROGRESS' && trip.status !== 'STARTED') {
            throw new Error(`Invalid Transition: Cannot complete trip from state ${trip.status}`);
        }

        trip.status = 'COMPLETED';
        trip.stateTimestamps = trip.stateTimestamps || {};
        trip.stateTimestamps.completedAt = new Date();
        await trip.save();

        // [Phase 5: Parallel Validation]
        ShadowValidator.validateStateTransition(trip, 'COMPLETED');

        return trip;
    }

    async removeClient(userId, { tripId, clientId }) {
        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        // Verify driver ownership
        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        // Find the client in the trip
        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        // Get the client's route ID to update its status
        const clientRouteId = trip.clients[clientIndex].routeId;

        // Remove client from trip
        trip.clients.splice(clientIndex, 1);

        // Reset trip status to 'PENDING'
        trip.status = 'PENDING';

        await trip.save();

        // Update Client Route status back to 'pending' so they can search again
        if (clientRouteId) {
            await Route.findByIdAndUpdate(clientRouteId, { status: 'pending' });
        }

        // Mark request as 'rejected'
        await JoinRequest.findOneAndUpdate(
            { tripId, clientId, status: 'accepted' },
            { status: 'rejected' }
        );

        return trip;
    }

    async confirmPickup(driverId, { tripId, clientId, driverLocation }) {
        const TripInstance = require('../models/TripInstance');
        if (await TripInstance.findById(tripId)) {
            throw new Error('Direct pickup on TripInstance is prohibited. Use canonical OTP boarding endpoint.');
        }

        const session = await tripRepository.model.startSession();
        session.startTransaction();

        try {
            const trip = await tripRepository.findById(tripId).populate('clients.routeId').populate('routeId').session(session);
            if (!trip) throw new Error('Trip not found');

            if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

            if (trip.status !== 'ARRIVED_PICKUP' && trip.status !== 'IN_PROGRESS' && trip.status !== 'STARTED') {
                throw new Error(`Invalid Transition: Cannot confirm pickup from state ${trip.status}`);
            }

            const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
            if (clientIndex === -1) throw new Error('Client not found in trip');

            const clientEntry = trip.clients[clientIndex];

            if (clientEntry.status !== 'PICKUP_INCOMING' && clientEntry.status !== 'READY' && clientEntry.status !== 'WAITING') {
                throw new Error(`Invalid Client Transition: Cannot confirm pickup for client in state ${clientEntry.status}`);
            }

            if (driverLocation && clientEntry.routeId && clientEntry.routeId.startPoint) {
                const pickupCoords = clientEntry.routeId.startPoint.coordinates; // [lng, lat]
                const distance = this.calculateDistance(driverLocation.lat, driverLocation.lng, pickupCoords[1], pickupCoords[0]);
                if (distance > 200) { // 200 meters radius
                    throw new Error(`Location validation failed: You are ${Math.round(distance)}m away from pickup`);
                }
            }

            let price = clientEntry.price;
            if (!price) {
                const driverRoute = await Route.findById(trip.routeId).session(session);
                price = driverRoute.price.amount;
            }

            try {
                // Pass the session to ensure atomicity
                await transactionService.processTripPayment(trip._id, clientId, driverId, price, session);
                
                // Atomic update to avoid race conditions when picking up multiple clients simultaneously
                const updateResult = await tripRepository.model.updateOne(
                    { 
                        _id: trip._id, 
                        'clients.userId': clientId,
                        'clients.status': { $in: ['PICKUP_INCOMING', 'READY', 'WAITING'] }
                    },
                    { 
                        $set: { 
                            'clients.$.status': 'IN_CAR',
                            'clients.$.paymentStatus': 'paid',
                            status: 'IN_PROGRESS' 
                        } 
                    },
                    { session }
                );

                if (updateResult.modifiedCount === 0) {
                    throw new Error('Concurrent modification error or invalid client state during pickup');
                }

                // Update in-memory object to return to the caller
                clientEntry.status = 'IN_CAR';
                clientEntry.paymentStatus = 'paid';
                trip.status = 'IN_PROGRESS';
                
                // [Phase 5: Parallel Validation]
                ShadowValidator.validateStateTransition(trip, 'IN_PROGRESS');

            } catch (paymentError) {
                console.error('Payment failed:', paymentError);
                throw new Error(`Payment failed: ${paymentError.message}`);
            }

            await session.commitTransaction();
            session.endSession();
            return trip;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    async confirmDropoff(driverId, { tripId, clientId, driverLocation }) {
        const TripInstance = require('../models/TripInstance');
        if (await TripInstance.findById(tripId)) {
            throw new Error('Direct dropoff on TripInstance is prohibited. Use canonical dropoff endpoint.');
        }

        const trip = await tripRepository.findById(tripId).populate('clients.routeId');
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        if (trip.status !== 'IN_PROGRESS') {
            throw new Error(`Invalid Transition: Cannot confirm dropoff from state ${trip.status}`);
        }

        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        const clientEntry = trip.clients[clientIndex];

        if (clientEntry.status !== 'IN_CAR') {
            throw new Error(`Invalid Client Transition: Cannot confirm dropoff for client in state ${clientEntry.status}`);
        }

        if (driverLocation && clientEntry.routeId && clientEntry.routeId.endPoint) {
            const dropoffCoords = clientEntry.routeId.endPoint.coordinates; // [lng, lat]
            const distance = this.calculateDistance(driverLocation.lat, driverLocation.lng, dropoffCoords[1], dropoffCoords[0]);
            if (distance > 200) { // 200 meters radius
                throw new Error(`Location validation failed: You are ${Math.round(distance)}m away from dropoff`);
            }
        }

        const updateResult = await tripRepository.model.updateOne(
            { 
                _id: tripId, 
                'clients.userId': clientId,
                'clients.status': 'IN_CAR'
            },
            { 
                $set: { 
                    'clients.$.status': 'DROPPED_OFF'
                } 
            }
        );

        if (updateResult.modifiedCount === 0) {
            throw new Error('Concurrent modification error or invalid client state during dropoff');
        }

        clientEntry.status = 'DROPPED_OFF';
        return trip;
    }

    async clientConfirmWaiting(clientId, tripId) {
        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        const clientEntry = trip.clients[clientIndex];

        if (clientEntry.status !== 'WAITING') {
            throw new Error(`Invalid Client Transition: Cannot ready from state ${clientEntry.status}`);
        }

        clientEntry.status = 'READY';
        await trip.save();
        return trip;
    }

    async driverArrivedAtPickup(driverId, { tripId, clientId, driverLocation }) {
        const trip = await tripRepository.findById(tripId).populate('clients.routeId');
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        if (trip.status !== 'STARTED' && trip.status !== 'IN_PROGRESS') {
            throw new Error(`Invalid Transition: Cannot arrive at pickup from state ${trip.status}`);
        }

        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        const clientEntry = trip.clients[clientIndex];

        if (clientEntry.status !== 'READY' && clientEntry.status !== 'WAITING') {
            throw new Error(`Invalid Client Transition: Cannot arrive for client in state ${clientEntry.status}`);
        }

        if (driverLocation && clientEntry.routeId && clientEntry.routeId.startPoint) {
            const pickupCoords = clientEntry.routeId.startPoint.coordinates; // [lng, lat]
            const distance = this.calculateDistance(driverLocation.lat, driverLocation.lng, pickupCoords[1], pickupCoords[0]);
            if (distance > 200) { // 200 meters radius
                throw new Error(`Location validation failed: You are ${Math.round(distance)}m away from pickup`);
            }
        }

        const LegacyRouteStateMachine = require('../state/LegacyRouteStateMachine');
        const LegacyClientStateMachine = require('../state/LegacyClientStateMachine');

        LegacyRouteStateMachine.validateTransition(trip.status, 'ARRIVED_PICKUP');
        LegacyClientStateMachine.validateTransition(clientEntry.status, 'PICKUP_INCOMING');

        trip.status = 'ARRIVED_PICKUP';
        clientEntry.status = 'PICKUP_INCOMING';
        await trip.save();
        
        // [Phase 5: Parallel Validation]
        ShadowValidator.validateStateTransition(trip, 'ARRIVED_PICKUP');
        return trip;
    }
    // ============================================
    // PHASE 7: PICKUP, DROPOFF, & DISPUTES
    // ============================================

    async cancelPickup(driverId, { tripId, clientId, reason }) {
        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');
        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        const clientEntry = trip.clients.find(c => c.userId.toString() === clientId);
        if (!clientEntry) throw new Error('Client not found in trip');

        if (clientEntry.status !== 'WAITING' && clientEntry.status !== 'READY' && clientEntry.status !== 'PICKUP_INCOMING') {
            throw new Error(`Cannot cancel pickup from state ${clientEntry.status}`);
        }

        clientEntry.status = 'CANCELLED_AT_PICKUP';
        trip.cancellationReason = reason;

        await trip.save();

        if (this.io) {
            this.io.to(`user:${clientId}`).emit('trip_cancelled_at_pickup', { tripId, reason });
            this.io.to(`user:${driverId}`).emit('trip_updated', { tripId });
        }

        return trip;
    }

    async cancelDropoff(driverId, { tripId, clientId, reason }) {
        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');
        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        const clientEntry = trip.clients.find(c => c.userId.toString() === clientId);
        if (!clientEntry) throw new Error('Client not found in trip');

        if (clientEntry.status !== 'IN_CAR') {
            throw new Error(`Cannot cancel dropoff from state ${clientEntry.status}`);
        }

        clientEntry.status = 'CANCELLED_AT_DROPOFF';
        trip.cancellationReason = reason;

        await trip.save();

        if (this.io) {
            this.io.to(`user:${clientId}`).emit('trip_cancelled_at_dropoff', { tripId, reason });
            this.io.to(`user:${driverId}`).emit('trip_updated', { tripId });
        }

        return trip;
    }

    async clientConfirmPickedUp(clientId, { tripId, isConfirmed, rating, reason }) {
        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        const clientEntry = trip.clients.find(c => c.userId.toString() === clientId);
        if (!clientEntry) throw new Error('Client not found in trip');

        // Driver must have marked them IN_CAR first
        if (clientEntry.status !== 'IN_CAR' && clientEntry.status !== 'PICKUP_DISPUTED') {
            throw new Error(`Cannot confirm pickup from state ${clientEntry.status}`);
        }

        if (isConfirmed) {
            // No status change (they are IN_CAR), but we can record the rating for the driver arriving on time
            if (rating) clientEntry.driverRating = rating;
        } else {
            const LegacyClientStateMachine = require('../state/LegacyClientStateMachine');
            LegacyClientStateMachine.validateTransition(clientEntry.status, 'PICKUP_DISPUTED');
            clientEntry.status = 'PICKUP_DISPUTED';
            trip.cancellationReason = `Client Disputed Pickup: ${reason}`;
            // System could trigger refund or admin review here
        }

        await trip.save();

        if (this.io) {
            this.io.to(`user:${trip.driverId.toString()}`).emit('client_pickup_confirmed', { tripId, clientId, isConfirmed, rating });
        }

        return trip;
    }

    async clientConfirmDroppedOff(clientId, { tripId, isConfirmed, rating, reason }) {
        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        const clientEntry = trip.clients.find(c => c.userId.toString() === clientId);
        if (!clientEntry) throw new Error('Client not found in trip');

        // Driver must have marked them DROPPED_OFF first
        if (clientEntry.status !== 'DROPPED_OFF' && clientEntry.status !== 'DROPOFF_DISPUTED') {
            throw new Error(`Cannot confirm dropoff from state ${clientEntry.status}`);
        }

        if (isConfirmed) {
            clientEntry.status = 'COMPLETED';
            if (rating) clientEntry.driverRating = rating;

            // Check if all clients are completed to auto-complete trip? (Prompt says Driver finishes trip)
        } else {
            clientEntry.status = 'DROPOFF_DISPUTED';
            trip.cancellationReason = `Client Disputed Dropoff: ${reason}`;
        }

        await trip.save();

        if (this.io) {
            this.io.to(`user:${trip.driverId.toString()}`).emit('client_dropoff_confirmed', { tripId, clientId, isConfirmed, rating });
        }

        return trip;
    }

    async finishTrip(driverId, tripId) {
        const trip = await tripRepository.findById(tripId);
        if (!trip) throw new Error('Trip not found');
        if (trip.driverId.toString() !== driverId.toString()) throw new Error('Not authorized');
        if (trip.status !== 'STARTED' && trip.status !== 'IN_PROGRESS') {
            throw new Error(`Cannot finish trip from state: ${trip.status}`);
        }

        // Verify that all clients are in terminal states
        const nonTerminalStates = ['PENDING', 'WAITING', 'CONFIRMED', 'READY', 'STARTING_SOON', 'IN_CAR'];
        const unfinishedClients = trip.clients.filter(c => nonTerminalStates.includes(c.status));

        if (unfinishedClients.length > 0) {
            throw new Error(`Cannot finish trip: ${unfinishedClients.length} client(s) are still active.`);
        }

        const Route = require('../models/Route'); // Assuming Trip is actually Route under the hood for V1
        const updatedTrip = await Route.findOneAndUpdate(
            { _id: tripId, status: { $in: ['STARTED', 'IN_PROGRESS'] } },
            { 
                $set: { 
                    status: 'COMPLETED',
                    'stateTimestamps.completedAt': new Date()
                }
            },
            { new: true }
        );

        if (!updatedTrip) {
            // Either already completed or invalid state
            const currentTrip = await tripRepository.findById(tripId);
            if (currentTrip && currentTrip.status === 'COMPLETED') {
                return currentTrip; // Idempotent return
            }
            throw new Error('Trip could not be completed, it may have already been finished concurrently.');
        }

        // Use updatedTrip from now on for calculations
        Object.assign(trip, updatedTrip.toObject());
        
        // Log Analytics
        const analyticsService = require('./analyticsService');
        await analyticsService.logTripCompletion(trip.driverId, false);

        // [Phase 3 Resilience Fix] Fire Domain Event instead of direct wallet processing
        // This delegates finance execution to the idempotent TransactionService wrapper
        const DomainEventBus = require('../events/DomainEventBus');
        DomainEventBus.publish('TripCompleted', tripId, { tripInstanceId: tripId });

        if (this.io) {
            this.io.to(`trip:${tripId}`).emit('trip_completed', { tripId, completedAt: trip.stateTimestamps.completedAt });
            this.io.to(`user:${driverId}`).emit('trip_updated', { tripId });
            trip.clients.forEach(c => {
                this.io.to(`user:${c.userId}`).emit('trip_updated', { tripId });
            });
        }

        return trip;
    }

    /**
     * Create a "client trip" — wraps createRoute but returns trip-shaped data
     * so the client frontend only thinks in terms of "trips", not "routes".
     */
    async createClientTrip(userId, tripData) {
        const {
            startPoint, endPoint, waypoints,
            days, timeStart, price
        } = tripData;

        // Internally create a Route (needed for geospatial matching)
        const route = await this.createRoute(userId, {
            role: 'client',
            startPoint,
            endPoint,
            waypoints: waypoints || [],
            days: days || [],
            timeStart: timeStart || '',
            timeArrival: '',
            price: price || 0,
            priceType: 'fix',
        });

        // Return trip-shaped response for the client
        return {
            id: route._id,
            routeId: route._id,
            startPoint: {
                latitude: route.startPoint.coordinates[1],
                longitude: route.startPoint.coordinates[0],
                address: route.startPoint.address
            },
            endPoint: {
                latitude: route.endPoint.coordinates[1],
                longitude: route.endPoint.coordinates[0],
                address: route.endPoint.address
            },
            waypoints: (route.waypoints || []).map(wp => ({
                latitude: wp.coordinates[1],
                longitude: wp.coordinates[0],
                address: wp.address
            })),
            days: route.schedule?.days || [],
            timeStart: route.schedule?.time || '',
            price: route.price?.amount || 0,
            status: 'searching', // Client just created it, waiting for driver match
            createdAt: route.createdAt
        };
    }
}

module.exports = new TripService();
