// authController.js
const pool = require("../dataBase/dataBase.js");
const crypto = require('crypto')

const hashPassword = password => {
    return crypto.createHash('sha1').update(password).digest('hex')
}

const compareHashPassword = (password, hashedPassword) => {
    if (hashPassword(password) === hashedPassword) {
        return true
    }
    return false
}

// Страница логина
exports.getLogin = (req, res) => {
    res.render('auth/login', { error: null, authing: true });
};

// Обработка логина
exports.postLogin = (req, res) => {
    const { login, password } = req.body;
    pool.query("SELECT * FROM users WHERE login = ?", [login], async (err, results) => {
        if (err) {
            console.error(err);
            return res.render('auth/login', {
                error: 'Ошибка сервера при поиске пользователя',
                authing: true
            });
        }
        const user = results[0];
        if (!user) {
            return res.render('auth/login', {
                error: 'Пользователь не найден',
                authing: true
            });
        }

        const isMatch = compareHashPassword(password, user.password);
        if (!isMatch) {
            return res.render('auth/login', {
                error: 'Неверный пароль',
                authing: true
            });
        }

        req.session.user = user;
        // res.cookie("userSession", req.session.user, {
        //     httpOnly: true,
        //     signed: true, // Подписанная кука
        //     secure: false, // Установите true при HTTPS
        //     maxAge: 1000 * 60 * 60 * 24,
        // });
        res.redirect('/');
    });
};

// Выход
exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.redirect('/');
    });
};

// Middleware проверки
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
};

exports.isNotAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) return next();
    res.redirect('/register');
};
