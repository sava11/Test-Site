
const pool = require("../dataBase/dataBase.js");

module.exports = {
    // Создание нового пользователя
    create: async ({ login, email, password }) => {
        const result = await pool.query(
            'INSERT INTO users(login, email, password) VALUES($1, $2, $3)',
            [login, email, password]
        );
        return result.rows[0];
    },
    // Поиск пользователя по email
    findByEmail: async (email) => {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    },
    // Поиск пользователя по логину
    findByLogin: async (login) => {
        const result = await pool.query('SELECT * FROM users WHERE login = $1', [login]);
        return result.rows[0];
    },
    // Удаление пользователя по логину
    deleteUserByLogin: async (login) => {
        await pool.query('DELETE FROM users WHERE login = $1', [login]);
    }
};
