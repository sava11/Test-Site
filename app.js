require('dotenv').config();
const express = require("express");
const session = require("express-session");
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require("cookie-parser");
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const key = process.env.SECRET_KEY;
app.use(cookieParser(key)); // Установлен секретный ключ для подписанных "печенек"
app.use(session({
    secret: key,
    resave: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: true, // Делаем "печеньки" HttpOnly
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 7 * 60 * 60 * 24, // Время жизни "печеньки" (например, 7 дней)
    }
}));

app.use(expressLayouts);
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Установка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('layout', 'layouts/layout');
app.set('trust proxy', 1);
app.set('views', path.resolve(__dirname, 'views'));

app.use((req, res, next) => {
    res.locals.self_user = req.session.user || null;
    res.locals.authing=false
    next();
});

// Создание routers
const homeRouter = require("./routes/homeRouter.js");
const authRouter = require("./routes/authRouter.js");
const userRouter = require("./routes/userRouter.js");
const companiesRouter = require("./routes/companiesRouter.js");
const imagesRouter = require('./routes/imageRouter');

// Применение routers
app.use("/", homeRouter);
app.use("/", authRouter);
app.use("/user", userRouter);
app.use("/companies", companiesRouter);
app.use('/images', imageRouter);

module.exports = app;

if (require.main === module) {
    app.listen(port, () => console.log(
        `Сервер запущен на порту: ${port} и ожидает подключений...`));
}