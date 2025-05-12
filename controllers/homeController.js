const pool = require('../dataBase/dataBase');
const crypto = require('crypto')

const hashPassword = password => {
  return crypto.createHash('sha1').update(password).digest('hex')
}


exports.getUsers = (req, res, next) => {
  const {
    login = '',
    f_name = '',
    s_name = '',
    t_name = '',
    date_from = '',
    date_to = '',
    page = 1,
    size = 10
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(size, 10)));
  const offset = (pageNum - 1) * pageSize;

  const conditions = ['status = 1'];
  const params = [];

  if (login) { conditions.push('login LIKE ?'); params.push(`%${login}%`); }
  if (f_name) { conditions.push('f_name LIKE ?'); params.push(`%${f_name}%`); }
  if (s_name) { conditions.push('s_name LIKE ?'); params.push(`%${s_name}%`); }
  if (t_name) { conditions.push('t_name LIKE ?'); params.push(`%${t_name}%`); }

  if (date_from) {
    conditions.push('DATE(created_at) >= ?');
    params.push(date_from);
  }

  if (date_to) {
    conditions.push('DATE(created_at) <= ?');
    params.push(date_to);
  }

  const whereClause = ' WHERE ' + conditions.join(' AND ');

  const sql = `
    SELECT login, f_name, s_name, t_name, created_at
      FROM users 
      ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?
  `;
  params.push(pageSize, offset);

  pool.query(sql, params, (err, results) => {
    if (err) return next(err);
    res.render('user/list', {
      users: results,
      filters: { login, f_name, s_name, t_name, date_from, date_to },
      page: pageNum,
      size: pageSize
    });
  });
};

exports.getAllAttemptsTree = (req, res, next) => {
  const { login } = req.params;

  const sql = `
    SELECT ulr.level_id, ulr.points, ulr.collected, ulr.hits, ulr.record_date
    FROM user_level_records ulr
    JOIN users u ON ulr.user_login = u.login
    WHERE u.login = ?
    ORDER BY ulr.level_id ASC, ulr.record_date DESC
  `;

  pool.query(sql, [login], (err, rows) => {
    if (err) return next(err);

    // Группируем по level_id
    const tree = {};
    rows.forEach(r => {
      if (!tree[r.level_id]) tree[r.level_id] = [];
      tree[r.level_id].push(r);
    });

    res.render('user/view_tree', { login, tree });
  });
};

exports.getAddUser = (req, res) => {
  res.render('user/add_edit_user', {
    mode: 'add',
    user: {}
  });
};

// Обработка POST /add
exports.postAddUser = async (req, res, next) => {
  try {
    const { login, password, f_name, s_name, t_name } = req.body;
    const hash = hashPassword(password);
    const sql = `
      INSERT INTO users (login, password, f_name, s_name, t_name, status)
      VALUES (?, ?, ?, ?, ?, 1)
    `;
    await pool.promise().execute(sql, [login, hash, f_name, s_name, t_name]);
    res.redirect('/');
  } catch (err) {
    next(err);
  }
};

// Форма: редактировать пользователя
exports.getEditUser = (req, res, next) => {
  const { login } = req.params;
  const sql = `
    SELECT login, f_name, s_name, t_name
      FROM users
     WHERE login = ? AND status = 1
     LIMIT 1
  `;
  pool.query(sql, [login], (err, results) => {
    if (err) return next(err);
    if (!results.length) return res.status(404).send('Пользователь не найден');
    res.render('user/add_edit_user', {
      mode: 'edit',
      user: results[0]
    });
  });
};

// Обработка POST /edit/:login
exports.postEditUser = async (req, res, next) => {
  try {
    const oldLogin = req.params.login;
    const { login, f_name, s_name, t_name } = req.body;
    const fields = [];
    const params = [];

    // логин
    fields.push('login = ?');
    params.push(login);

    // если смена пароля
    if (password) {
      const hash = hashPassword(password);
      fields.push('password = ?');
      params.push(hash);
    }

    fields.push('f_name = ?', 's_name = ?', 't_name = ?');
    params.push(f_name, s_name, t_name);

    params.push(oldLogin);

    const sql = `
      UPDATE users
         SET ${fields.join(', ')}
       WHERE login = ? AND status = 1
    `;
    await pool.promise().execute(sql, params);
    res.redirect('/');
  } catch (err) {
    next(err);
  }
};

exports.requestDeleteUser = (req, res, next) => {
  const login = req.params.login;

  // Вызываем процедуру create_delete_request
  pool.query("CALL create_delete_request(?)", [login], err => {
    if (err) return next(err);
    // После запроса просто перезагружаем список
    res.redirect('back');
  });
};