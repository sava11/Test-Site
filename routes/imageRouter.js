const express = require('express');
const router = express.Router();
const imagesController = require('../controllers/imagesController');
const {isNotUser} = require('../controllers/authController');

router.post('/image/:id', isNotUser, imagesController.uploadCompanyImage);
router.get('/image/:id', imagesController.getCompanyImage);

module.exports = router;
