const express = require('express');
const router = express.Router();
const companiesController = require('../controllers/companyController');
const {isNotUser, isAuthenticated} = require('../controllers/authController');

// Список компанийisNotUser
router.get('/', companiesController.getCompaniesList);

// Создание новой компании 
router.get('/create', isNotUser, companiesController.showCreateForm);
router.post('/create', companiesController.createCompany);

// Редактирование новой компании 
router.get('/edit/:id', isNotUser, companiesController.showEditForm);
router.post('/edit/:id', isNotUser, companiesController.updateCompany);

// Редактирование новой компании 
router.post('/delete/:id', isNotUser, companiesController.deleteCompany);

// Поиск компаний (например, с помощью GET-параметров)
router.get('/search', companiesController.searchCompanies);

// Страница подробной информации о конкретной компании
router.get('/:id', companiesController.getCompanyDetails);
router.get('/:id/statistics/:serviceId', companiesController.getPriceStatistics);
router.get('/:id/statistics/:serviceId/csv', isAuthenticated, companiesController.getPriceStatisticsCsv);

module.exports = router;
