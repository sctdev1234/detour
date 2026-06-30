const BaseRepository = require('./BaseRepository');
const Route = require('../models/Route');

class RouteRepository extends BaseRepository {
    constructor() {
        super(Route);
    }

    async findByUserId(userId) {
        return await this.find({ userId });
    }
}

module.exports = new RouteRepository();
