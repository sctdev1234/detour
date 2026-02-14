const { z } = require('zod');

const createRouteSchema = z.object({
    body: z.object({
        role: z.enum(['driver', 'client']),
        startPoint: z.object({
            address: z.string(),
            latitude: z.number(),
            longitude: z.number()
        }),
        endPoint: z.object({
            address: z.string(),
            latitude: z.number(),
            longitude: z.number()
        }),
        // Allow optional fields
        carId: z.string().optional(),
        waypoints: z.array(z.any()).optional(),
        routeGeometry: z.any().optional(),
        price: z.number().optional(),
        priceType: z.string().optional(),
        days: z.array(z.string()).optional(),
        timeStart: z.string().optional(),
        timeArrival: z.string().optional(),
        distanceKm: z.number().optional(),
        estimatedDurationMin: z.number().optional()
    })
});

const joinRequestSchema = z.object({
    body: z.object({
        clientRouteId: z.string(),
        tripId: z.string(),
        proposedPrice: z.number().optional()
    })
});

const handleRequestSchema = z.object({
    body: z.object({
        requestId: z.string(),
        status: z.enum(['accepted', 'rejected'])
    })
});

module.exports = {
    createRouteSchema,
    joinRequestSchema,
    handleRequestSchema
};
