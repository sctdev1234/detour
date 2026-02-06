const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { auth } = require('../middleware/auth');

// @route   POST api/upload/profile
// @desc    Upload profile image
router.post('/profile', auth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        // Construct URL
        const protocol = req.protocol;
        const host = req.get('host');
        // Note: We need a way to serve static files. Assuming '/uploads' route.
        const fileUrl = `${protocol}://${host}/uploads/profiles/${req.file.filename}`;

        res.json({
            msg: 'File uploaded successfully',
            url: fileUrl,
            filename: req.file.filename
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
