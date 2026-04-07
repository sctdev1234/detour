const Page = require('../models/Page');

// @desc    Get all pages (admin)
// @route   GET /api/pages
// @access  Private/Admin
exports.getAllPages = async (req, res) => {
    try {
        const pages = await Page.find();
        res.json({ success: true, count: pages.length, data: pages });
    } catch (error) {
        console.error('Error fetching all pages:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get a single page by type
// @route   GET /api/pages/:pageType
// @access  Public
exports.getPageByType = async (req, res) => {
    try {
        const { pageType } = req.params;
        let page = await Page.findOne({ pageType });

        if (!page) {
            // Return an empty object if the page doesn't exist yet rather than a 404 to gracefully handle new DBs
            return res.json({ success: true, data: { pageType, content: '' } });
        }

        res.json({ success: true, data: page });
    } catch (error) {
        console.error(`Error fetching page ${req.params.pageType}:`, error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Create or update a page
// @route   PUT /api/pages/:pageType
// @access  Private/Admin
exports.updatePage = async (req, res) => {
    try {
        const { pageType } = req.params;
        const { content } = req.body;

        const validTypes = ['terms', 'privacy', 'contact', 'about', 'help', 'faq'];
        if (!validTypes.includes(pageType)) {
            return res.status(400).json({ success: false, message: 'Invalid page type' });
        }

        let page = await Page.findOne({ pageType });

        if (page) {
            // Update existing
            page.content = content;
            await page.save();
        } else {
            // Create new
            page = await Page.create({ pageType, content });
        }

        res.json({ success: true, message: 'Page updated successfully', data: page });
    } catch (error) {
        console.error(`Error updating page ${req.params.pageType}:`, error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
