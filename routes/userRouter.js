const express = require('express');
const router = express.Router();

const controller = require('../controllers/userController');
const authController = require('../controllers/authController');

// Действия пользователя
router.get('/:login', controller.getUser);
router.post('/delete/:login', authController.isAuthenticated, controller.postDeleteUser);
router.post('/delete/:login', authController.isAuthenticated, controller.postDeleteUser);

module.exports = router;
