const BaseRepository = require('./BaseRepository');
const Page = require('../models/Page');

class PageRepository extends BaseRepository {
    constructor() {
        super(Page);
    }

    async findByPageType(pageType) {
        return await this.findOne({ pageType });
    }
}

module.exports = new PageRepository();
