const PageRepository = require('../repositories/PageRepository');
const { DatabaseError, ValidationError } = require('../utils/errors');

class PageService {
    async getAllPages() {
        try {
            return await PageRepository.find();
        } catch (err) {
            throw new DatabaseError(`Failed to fetch pages: ${err.message}`);
        }
    }

    async getPageByType(pageType) {
        try {
            let page = await PageRepository.findByPageType(pageType);
            if (!page) {
                return { pageType, content: '' };
            }
            return page;
        } catch (err) {
            throw new DatabaseError(`Failed to fetch page ${pageType}: ${err.message}`);
        }
    }

    async updatePage(pageType, content) {
        const validTypes = ['terms', 'privacy', 'contact', 'about', 'help', 'faq'];
        if (!validTypes.includes(pageType)) {
            throw new ValidationError('Invalid page type');
        }

        try {
            let page = await PageRepository.findByPageType(pageType);
            if (page) {
                return await PageRepository.update(page._id, { content });
            } else {
                return await PageRepository.create({ pageType, content });
            }
        } catch (err) {
            throw new DatabaseError(`Failed to update page ${pageType}: ${err.message}`);
        }
    }
}

module.exports = new PageService();
