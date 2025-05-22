const pool = require('../dataBase/dataBase');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const hashPassword = password => {
  return crypto.createHash('sha256').update(password).digest('hex');
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

  const conditions = ['status = 1','udr.user_login IS NULL'];
  const params = [];

  if (login) { conditions.push('login LIKE ?'); params.push(`%${login}%`); }
  if (f_name) { conditions.push('f_name LIKE ?'); params.push(`%${f_name}%`); }
  if (s_name) { conditions.push('s_name LIKE ?'); params.push(`%${s_name}%`); }
  if (t_name) { conditions.push('t_name LIKE ?'); params.push(`%${t_name}%`); }

  if (date_from) {
    conditions.push('DATE(DOB) >= ?');
    params.push(date_from);
  }

  if (date_to) {
    conditions.push('DATE(DOB) <= ?');
    params.push(date_to);
  }

  const whereClause = ' WHERE ' + conditions.join(' AND ');

  const sql = `
      SELECT
        u.login,
        u.f_name,
        u.s_name,
        u.t_name,
        u.DOB
      FROM users AS u
      LEFT JOIN user_delete_requests AS udr
      ON u.login = udr.user_login
      ${whereClause}
      ORDER BY u.created_at DESC
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
    WHERE u.login = ? and ulr.level_id > 0
    ORDER BY ulr.level_id ASC, ulr.record_date ASC
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

exports.downloadUserAttemptsPDF = (req, res, next) => {
  const { login } = req.params;

  const sql = `
    SELECT ulr.level_id, ulr.points, ulr.collected, ulr.hits, ulr.record_date
    FROM user_level_records ulr
    JOIN users u ON ulr.user_login = u.login
    WHERE u.login = ? AND ulr.level_id > 0
    ORDER BY ulr.level_id ASC, ulr.record_date ASC
  `;

  pool.query(sql, [login], (err, rows) => {
    if (err) return next(err);

    if (!rows.length) {
      return res.status(404).json({ message: 'Нет данных для экспорта.' });
    }

    // Сразу группируем по level_id
    const tree = {};
    rows.forEach(r => {
      if (!tree[r.level_id]) tree[r.level_id] = [];
      tree[r.level_id].push(r);
    });

    // Второй запрос — берём ФИО пользователя
    const userSql = `
      SELECT f_name, s_name, t_name
      FROM users
      WHERE login = ?
      LIMIT 1
    `;

    pool.query(userSql, [login], async (err2, userRows) => {
      if (err2) return next(err2);
      if (!userRows.length) {
        return res.status(404).json({ message: 'Пользователь не найден.' });
      }

      const { f_name, s_name, t_name } = userRows[0];

      try {
        // Генерируем графики через chartjs-node-canvas
        const chartImages = await Promise.all(
          Object.values(tree).map(async attempts => {
            const width = attempts.length > 3 ? attempts.length * 100 : 600;
            const height = 300;
            const canvasRender = new ChartJSNodeCanvas({ width, height });
            const config = {
              type: 'line',
              data: {
                labels: attempts.map(a => new Date(a.record_date)
                  .toLocaleDateString('ru-RU')),
                datasets: [
                  { label: 'Очки',      data: attempts.map(a => a.points),    fill: false },
                  { label: 'Собрано',   data: attempts.map(a => a.collected), fill: false },
                  { label: 'Повреждения', data: attempts.map(a => a.hits),    fill: false },
                ]
              },
              options: {
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                  x: { title: { display: true, text: 'Дата' } },
                  y: { title: { display: true, text: 'Значение' }, beginAtZero: true }
                },
                plugins: {
                  legend: { position: 'top' }
                }
              }
            };
            return canvasRender.renderToDataURL(config);
          })
        );

        // Рендерим HTML, передаём login, ФИО, tree и массив картинок
        const html = await ejs.renderFile(
          path.join(__dirname, '../views/user/report.ejs'),
          { login, f_name, s_name, t_name, tree, chartImages }
        );

        // Запускаем Puppeteer и сохраняем PDF
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const exportDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

        const fileName = `${login}_report_${Date.now().toLocaleString("RU")}.pdf`;
        const filePath = path.join(exportDir, fileName);
        await page.pdf({ path: filePath, format: 'A4', printBackground: true });
        await browser.close();

        // Отправляем клиенту
        res.download(filePath, `user_report_${login}.pdf`, err3 => {
          if (err3) {
            console.error('Ошибка при отправке файла:', err3);
            return res.status(500).json({ message: 'Ошибка загрузки файла' });
          }
          // Удаляем временный файл через 10 сек.
          setTimeout(() => {
            fs.unlink(filePath, e => {
              if (e) console.error('Ошибка при удалении файла:', e);
            });
          }, 10000);
        });

      } catch (genErr) {
        console.error('Ошибка при генерации PDF:', genErr);
        res.status(500).json({ message: 'Ошибка при генерации PDF' });
      }
    });
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
    const { login, password, f_name, s_name, t_name, DOB } = req.body;
    const hash = hashPassword(password);
    const sql = `
      INSERT INTO users (login, password, f_name, s_name, t_name, DOB, status)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `;
    await pool.promise().execute(sql, [login, hash, f_name, s_name, t_name, DOB]);
    res.redirect('/');
  } catch (err) {
    next(err);
  }
};

// Форма: редактировать пользователя
exports.getEditUser = (req, res, next) => {
  const { login } = req.params;
  const sql = `
    SELECT login, f_name, s_name, t_name, DOB
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
    const { login, f_name, s_name, t_name, DOB } = req.body;
    const fields = [];
    const params = [];

    // логин
    fields.push('login = ?');
    params.push(login);

    // если смена пароля
    // if (password) {
    //   const hash = hashPassword(password);
    //   fields.push('password = ?');
    //   params.push(hash);
    // }

    fields.push('f_name = ?', 's_name = ?', 't_name = ?', 'DOB = ?');
    params.push(f_name, s_name, t_name, DOB);

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
    res.redirect(req.get("Referrer"));
  });
};