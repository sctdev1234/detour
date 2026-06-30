const { SavedPlaceRepository } = require('../repositories/PlaceRepository');
const { DatabaseError, ValidationError, AuthError } = require('../utils/errors');

class PlaceService {
    async getPlaces(userId) {
        try {
            return await SavedPlaceRepository.findByUser(userId);
        } catch (err) {
            throw new DatabaseError(`Failed to fetch places: ${err.message}`);
        }
    }

    async addPlace(userId, placeData) {
        try {
            const data = {
                user: userId,
                ...placeData
            };
            return await SavedPlaceRepository.create(data);
        } catch (err) {
            throw new DatabaseError(`Failed to add place: ${err.message}`);
        }
    }

    async deletePlace(userId, placeId) {
        const place = await SavedPlaceRepository.findById(placeId);
        if (!place) {
            throw new ValidationError('Place not found');
        }

        if (place.user.toString() !== userId) {
            throw new AuthError('Not authorized');
        }

        try {
            await SavedPlaceRepository.delete(placeId);
            return { msg: 'Place removed' };
        } catch (err) {
            throw new DatabaseError(`Failed to delete place: ${err.message}`);
        }
    }
}

module.exports = new PlaceService();
