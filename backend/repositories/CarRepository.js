const BaseRepository = require('./BaseRepository');
const Car = require('../models/Car');

class CarRepository extends BaseRepository {
    constructor() {
        super(Car);
    }

    async findByUserId(userId) {
        return await this.find({ userId });
    }
}

module.exports = new CarRepository();
