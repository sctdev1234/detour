const pageService = require('../services/pageService');

exports.getAllPages = async (req, res, next) => {
    try {
        const pages = await pageService.getAllPages();
        res.json({ success: true, count: pages.length, data: pages });
    } catch (error) {
        next(error);
    }
};

exports.getPageByType = async (req, res, next) => {
    try {
        const page = await pageService.getPageByType(req.params.pageType);
        res.json({ success: true, data: page });
    } catch (error) {
        next(error);
    }
};

exports.updatePage = async (req, res, next) => {
    try {
        const page = await pageService.updatePage(req.params.pageType, req.body.content);
        res.json({ success: true, message: 'Page updated successfully', data: page });
    } catch (error) {
        next(error);
    }
};
