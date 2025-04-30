const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');

// Главная страница
router.get('/', homeController.getHome);

module.exports = router;
