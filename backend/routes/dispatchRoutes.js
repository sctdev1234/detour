const express = require('require');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { protect } = require('../middleware/auth'); // Ensure auth middleware exists and is used

router.post('/template', protect, dispatchController.createTemplate);
router.post('/offer/:id/accept', protect, dispatchController.acceptOffer);

module.exports = router;
