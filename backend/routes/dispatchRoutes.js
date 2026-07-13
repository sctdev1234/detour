const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { auth } = require('../middleware/auth');

router.post('/template', auth, dispatchController.createTemplate);
router.post('/offer/:id/accept', auth, dispatchController.acceptOffer);
router.get('/recovery', auth, dispatchController.getRecoveryState);
router.post('/cancel', auth, dispatchController.cancelSearch);

module.exports = router;
