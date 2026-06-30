const placeService = require('../services/placeService');

class PlaceController {
    // Get all saved places for the current user
    async getPlaces(req, res, next) {
        try {
            const places = await placeService.getPlaces(req.user.id);
            res.json(places);
        } catch (err) {
            next(err);
        }
    }

    // Add a new saved place
    async addPlace(req, res, next) {
        try {
            const place = await placeService.addPlace(req.user.id, req.body);
            res.status(201).json(place);
        } catch (err) {
            next(err);
        }
    }

    // Delete a saved place
    async deletePlace(req, res, next) {
        try {
            const result = await placeService.deletePlace(req.user.id, req.params.id);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new PlaceController();
