const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('../middleware/uploadMiddleware');
const { auth } = require('../middleware/auth');

const { bucket } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// Generic upload function
const uploadToFirebase = (file, folder = 'misc') => {
    return new Promise((resolve, reject) => {
        const uniqueFilename = `${folder}/${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        const blob = bucket.file(uniqueFilename);
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype
            },
            resumable: false
        });

        blobStream.on('error', (err) => {
            console.error('Firebase upload error:', err);
            reject(err);
        });

        blobStream.on('finish', async () => {
            try {
                await blob.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                resolve({ url: publicUrl, filename: uniqueFilename });
            } catch (err) {
                reject(err);
            }
        });

        blobStream.end(file.buffer);
    });
};

// @route   POST api/upload
// @desc    Generic upload (uses req.body.folder)
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        console.log('[Upload] Request received');

        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }


        const folder = req.body.folder || 'misc';
        const result = await uploadToFirebase(req.file, folder);

        res.json({
            msg: 'File uploaded successfully',
            ...result
        });
    } catch (err) {
        console.error('Upload Error:', err.message);
        res.status(500).json({ msg: 'Cloud Upload Error' });
    }
});

// @route   POST api/upload/profile
// @desc    Upload profile image (Legacy compatibility)
router.post('/profile', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const result = await uploadToFirebase(req.file, 'profiles');

        res.json({
            msg: 'File uploaded successfully',
            ...result
        });
    } catch (err) {
        console.error('Profile Upload Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

