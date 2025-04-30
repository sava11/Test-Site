const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

// Отображение страницы входа
exports.getLogin = (req, res) => {
    res.render('auth/login', {
        error: null,
        authing:true
     });
};

// Обработка входа
exports.postLogin = async (req, res) => {
    const { login, password } = req.body;

    try {
        // Поиск пользователя по email
        const user = await userModel.findByLogin(login);
        if (!user) {
            return res.render('auth/login', { 
                error: 'Пользователь не найден',
                authing:true });
        }

        // Сравнение паролей
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('auth/login', { 
                error: 'Неверный пароль',
                authing:true });
        }

        // Сохранение информации о пользователе в сессии
        req.session.user = user;
        res.redirect('/user/'+user.login);
    } catch (err) {
        console.error(err);
        res.render('auth/login', { 
            error: 'Ошибка входа',
            authing:true 
        });
    }
};

// Отображение страницы регистрации
exports.getRegister = (req, res) => {
    res.render('auth/register', { 
        error: null,
        authing:true 
    });
};

// Обработка регистрации
exports.postRegister = async (req, res) => {
    const { email, password, login } = req.body;
    try {
        // Проверка существования пользователя
        const existingUser = await userModel.findByLogin(login);
        if (existingUser) {
            return res.render('auth/register', { 
                error: 'Пользователь с таким логином уже существует',
                authing:true
            });
        }
        // Хэширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);
        // Создание нового пользователя
        await userModel.create({ login, email, password: hashedPassword });
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.render('auth/register', { 
            error: 'Ошибка регистрации',
            authing:true 
        });
    }
};

// Выход пользователя
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error(err);
        res.redirect('/');
    });
};

// Функция-посредник для проверки аутентификации пользователя
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login');
}

exports.isNotAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return next();
    }
    res.redirect('/register');
}


exports.isNotUser = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.status>=2) {
        return next();
    }
    res.redirect(req.get('Referer') || '/');
}