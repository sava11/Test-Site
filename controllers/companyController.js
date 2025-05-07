const companiesModel = require('../models/companiesModel');

// Главная страница компаний – вывод списка
exports.getCompaniesList = async (req, res) => {
    try {
        const categories = await companiesModel.getAllCategories();
        const companies = await companiesModel.getAllCompanies(); // Предполагается, что этот метод уже реализован
        res.render('companies/list', {
            companies: companies || null,
            categories: categories || null,
            selectedCategoryId: req.query.categoryId || ''
        });
    } catch (error) {
        console.error('Ошибка при получении списка компаний:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
}

// Поиск компаний
exports.searchCompanies = async (req, res) => {
    try {
        const { searchTerm, categoryId } = req.query;
        const companies = await companiesModel.searchCompanies({ searchTerm, categoryId });
        const categories = await companiesModel.getAllCategories();
        res.render('companies/list', {
            searchTerm,
            companies: companies || null,
            categories: categories || null,
            selectedCategoryId: categoryId || ''
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Ошибка поиска компаний");
    }
}

// Страница подробной информации о компании
exports.getCompanyDetails = async (req, res) => {
    try {
        const companyId = req.params.id;
        const company = await companiesModel.findById(companyId);
        if (!company) {
            return res.status(404).send("Компания не найдена");
        }
        res.render('companies/details', { company });
    } catch (error) {
        console.error(error);
        res.status(500).send("Ошибка получения данных компании");
    }
}

exports.showCreateForm = async (req, res) => {
    try {
        const categories = await companiesModel.getAllCategories();
        res.render('companies/form', {
            title: 'Добавить компанию',
            company: {},
            categories,
            selectedCategories: [],
            formAction: '/companies/create',
            formMethod: 'POST',
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при загрузке формы создания компании');
    }
}

exports.createCompany = async (req, res) => {
    try {
        const { name, description, address, phone, email, website, experience_years, advantages, categories, services, branches } = req.body;
        const companyId = await companiesModel.createCompany({
            name,
            description,
            address,
            phone,
            email,
            website,
            experience_years,
            advantages
        });
        if (categories) {
            await companiesModel.setCategories(companyId, categories);
        }
        if (services) {
            await companiesModel.setServices(companyId, services);
        }
        if (branches) {
            await companiesModel.setBranches(companyId, branches);
        }
        res.status(200).json({ companyId })
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при создании компании');
    }
}

exports.showEditForm = async (req, res) => {
    try {
        const companyId = req.params.id;
        const company = await companiesModel.findById(companyId);
        const categories = await companiesModel.getAllCategories();
        const selectedCategories = await companiesModel.getCategoryIds(companyId);
        res.render('companies/form', {
            title: 'Редактировать компанию',
            company,
            categories,
            selectedCategories,
            formAction: `/companies/edit/${companyId}`,
            formMethod: 'POST',
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при загрузке формы редактирования компании');
    }
}

exports.updateCompany = async (req, res) => {
    try {
        const companyId = req.params.id;
        const { name, description, address, phone, email, website, experience_years, advantages, categories, services, branches } = req.body;
        await companiesModel.updateCompany(companyId, {
            name,
            description,
            address,
            phone,
            email,
            website,
            experience_years,
            advantages
        });
        if (categories) {
            await companiesModel.setCategories(companyId, categories);
        }
        if (services) {
            await companiesModel.setServices(companyId, services);
        }
        if (branches) {
            await companiesModel.setBranches(companyId, branches);
        }
        res.status(200).json({ companyId })
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при обновлении компании');
    }
}

exports.showDeleteCompany = async (req, res) => {
    try {
        const companyId = req.params.id;
        companiesModel.deleteCompany(companyId);
        res.redirect("/companies")
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при удалении компании');
    }
}

exports.deleteCompany = async (req, res) => {
    try {
        const companyId = req.params.id;
        companiesModel.deleteCompany(companyId);
        res.status(200).json({ ref: req.get('Referer') });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при удалении компании');
    }
}

exports.getPriceStatistics = async (req, res) => {
    try {
        const { id, serviceId } = req.params;
        // Получаем историю цен по компании и сервису
        const priceHistory = await companiesModel.getCompanyPriceStats(id, serviceId);

        // Получаем данные компании (для отображения заголовка)
        const company = await companiesModel.findOnlyCompany(id);

        // Получаем данные сервиса
        const service = await companiesModel.getCompanyServiceById(serviceId);

        res.render('companies/statistics', {
            company,
            service,
            priceHistory
        });
    } catch (error) {
        console.error('Ошибка получения статистики цен:', error);
        res.status(500).send('Ошибка получения статистики цен');
    }
};

exports.getPriceStatisticsCsv = async (req, res) => {
    try {
        const { id, serviceId } = req.params;

        // Получаем историю цен (должна возвращать массив записей с полями changed_at и price)

        const priceHistory = await companiesModel.getCompanyPriceStats(id, serviceId);

        if (!priceHistory || priceHistory.length === 0) {
            return res.status(404).send('Статистика цен не найдена');
        }

        // Формируем CSV: строка заголовка и строки с данными
        let csv = 'Дата изменения,Цена\r\n';
        priceHistory.forEach(row => {
            // Преобразуем дату в строку ISO (или можно изменить формат по необходимости)
            const dateStr = new Date(row.changed_at).toISOString();
            csv += `"${dateStr}","${row.price}"\r\n`;
        });
        // Получаем данные компании (для отображения заголовка)
        const company = await companiesModel.findOnlyCompany(id);

        // Получаем данные сервиса
        const service = await companiesModel.getCompanyServiceById(serviceId);

        // Настраиваем заголовки ответа для CSV
        res.header('Content-Type', 'text/csv');
        res.attachment(`price_statistics_company_${company.name}_service_${service.name}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Ошибка при получении CSV статистики цен:', error);
        res.status(500).send('Ошибка при получении статистики цен');
    }
};