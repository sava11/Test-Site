const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');
const {isAuthenticated} = require('../controllers/authController');

// Главная страница
router.get('/', isAuthenticated, homeController.getUsers);
router.get('/attempts/:login', isAuthenticated, homeController.getAllAttemptsTree);

router.get('/attempts/:login/pdf-report', homeController.downloadUserAttemptsPDF);
// Форма добавления пользователя
router.get('/add', isAuthenticated, homeController.getAddUser);
router.post('/add', isAuthenticated, homeController.postAddUser);

// Форма редактирования (по логину)
router.get('/edit/:login', isAuthenticated, homeController.getEditUser);
router.post('/edit/:login', isAuthenticated, homeController.postEditUser);
router.post('/delete/:login', isAuthenticated, homeController.requestDeleteUser);

module.exports = router;
