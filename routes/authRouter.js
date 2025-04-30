const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Подключение контроллеров авторизации
router.get('/login', authController.isNotAuthenticated, authController.getLogin);
router.post('/login', authController.isNotAuthenticated, authController.postLogin);
router.get('/register', authController.isNotAuthenticated, authController.getRegister);
router.post('/register', authController.isNotAuthenticated, authController.postRegister);
router.get('/logout', authController.isAuthenticated, authController.logout);

module.exports = router;
