const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { auth } = require('../middleware/auth');

router.post('/template', auth, dispatchController.createTemplate);
router.post('/offer/:id/accept', auth, dispatchController.acceptOffer);

module.exports = router;
