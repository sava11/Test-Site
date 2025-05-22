
const pool = require("../dataBase/dataBase.js");

module.exports = {
    // Создание нового пользователя
    create: async ({ login, password, f_name, s_name, t_name, DOB, status }) => {
        const [result] = await pool.execute(
            'INSERT INTO users (login, password, f_name, s_name, t_name, DOB, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [login, password, f_name, s_name, t_name, DOB, status]
        );
        return { id: result.insertId };
    },

    // Поиск пользователя по логину и статусу
    findByLogin: async (login, status) => {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE login = ? AND status = ? LIMIT 1',
            [login, status]
        );
        return rows[0] || null;
    },

    // Выбор всех пользователей с заданным статусом, отсортированных по дате создания
    findAll: async (status) => {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE status = ? ORDER BY created_at DESC',
            [status]
        );
        return rows;
    },

    // Вызов процедуры get_user_level_attempts по ID пользователя (нужно заменить login на user_id в процедуре!)
    getUserLevelAttempts: async (userId, levelId, sort) => {
        const [rows] = await pool.query(
            'CALL get_user_level_attempts(?, ?, ?)',
            [userId, levelId, sort]
        );
        // mysql2 возвращает массив массивов для CALL: [ [resultRows], [meta], ... ]
        return rows[0];
    },

    // Альтернативная процедура: получить все уровни
    getUserAllAttempts: async (userId, sort) => {
        const [rows] = await pool.query(
            'CALL get_user_all_attempts(?, ?)',
            [userId, sort]
        );
        return rows[0];
    },

    // Удаление пользователя по логину
    deleteUserByLogin: async (login) => {
        const [result] = await pool.execute(
            'DELETE FROM users WHERE login = ?',
            [login]
        );
        return result.affectedRows;
    }
};
