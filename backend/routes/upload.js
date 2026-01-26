const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage strategy
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Decide destination based on field name or body param
        // For simplicity, we can default to 'uploads/' or subfolders
        // But to match the "cars/id/..." structure used in frontend, 
        // we might just flattening it or create folders dynamically.
        // Let's dump everything in 'uploads' for now and return accessible URL.
        
        let dest = 'uploads/';
        if (req.body.folder) {
             dest = path.join('uploads', req.body.folder);
             if (!fs.existsSync(dest)){
                fs.mkdirSync(dest, { recursive: true });
            }
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// @route   POST api/upload
// @desc    Upload file
router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    // Return the URL to access this file
    // Assuming server is serving 'uploads' static folder at /uploads
    const fileUrl = `/uploads/${req.file.path.replace(/\\/g, '/').replace('uploads/', '')}`;
    
    res.json({
        msg: 'File uploaded',
        url: fileUrl,
        filename: req.file.filename
    });
});

module.exports = router;
