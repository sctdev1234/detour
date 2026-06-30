const BaseRepository = require('./BaseRepository');
const Place = require('../models/Place');
const SavedPlace = require('../models/SavedPlace');

class PlaceRepository extends BaseRepository {
    constructor() {
        super(Place);
    }
}

class SavedPlaceRepository extends BaseRepository {
    constructor() {
        super(SavedPlace);
    }

    async findByUser(userId) {
        return await this.find({ user: userId }, { sort: { createdAt: -1 } });
    }
}

module.exports = {
    PlaceRepository: new PlaceRepository(),
    SavedPlaceRepository: new SavedPlaceRepository()
};
