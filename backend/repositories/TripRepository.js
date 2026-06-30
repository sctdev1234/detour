const BaseRepository = require('./BaseRepository');
const Trip = require('../models/Trip');

class TripRepository extends BaseRepository {
    constructor() {
        super(Trip);
    }
}

module.exports = new TripRepository();
