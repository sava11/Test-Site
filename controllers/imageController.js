// controllers/fileController.js
const pool = require('../dataBase/db.js');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

// Каталог хранения по типам
const BASE_UPLOAD_DIR = path.join(__dirname, '../private/files');

// Определить тип файла по mime-type
function getFileCategory(mimetype) {
  if (/^image\//.test(mimetype)) return 'images';
  if (/^video\//.test(mimetype)) return 'videos';
  if (/^audio\//.test(mimetype)) return 'audio';
  // Исправленный регекс без лишнего слеша
  if (/^(?:text\/|application\/json)/.test(mimetype)) return 'text';
  return 'others';
}

// Настройки Multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const category = getFileCategory(file.mimetype);
    const dest = path.join(BASE_UPLOAD_DIR, category);
    try {
      await fs.mkdir(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}_${basename}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

// Загрузка нескольких файлов (до 10 за один запрос)
exports.uploadFiles = upload.array('files', 10);

// Сохранение информации о файлах в БД
exports.saveFilesMetadata = async (req, res) => {
  try {
    if (!req.files || !req.session.user) {
      return res.status(400).json({ message: 'Нет файлов или пользователь не авторизован.' });
    }

    const { description, tags, status } = req.body;
    const userId = req.session.user.id;
    const tagIds = tags ? JSON.parse(tags) : [];
    const results = [];

    for (const file of req.files) {
      const { filename, mimetype, size } = file;
      const originalName = file.originalname;
      const fileId = path.parse(filename).name;
      const category = getFileCategory(mimetype);

      // Запись в таблицу files
      await pool.promise().execute(
        `INSERT INTO files 
           (id, user_id, uploaded_at, category, ext, size, original_name, status, description) 
         VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
        [fileId, userId, category, path.extname(filename).slice(1), size, originalName, status || 'active', description || null]
      );

      // Теги (если есть)
      for (const tagId of tagIds) {
        await pool.promise().execute(
          `INSERT INTO file_tags (file_id, tag_id) VALUES (?, ?)`,
          [fileId, tagId]
        );
      }

      results.push({ id: fileId, originalName });
    }

    res.status(201).json({ message: 'Файлы сохранены.', files: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сохранения файлов.' });
  }
};

// Остальные методы (updateFile, deleteFile) остаются без изменений либо при необходимости могут поддерживать множественные файлы
exports.updateFile = async (req, res) => {
  try {
    const { id } = req.params;
    let newFilename;
    if (req.file) {
      newFilename = req.file.filename;
      const [[old]] = await pool.promise().execute(
        'SELECT category, ext, id FROM files WHERE id = ?', [id]
      );
      if (old) {
        const oldPath = path.join(BASE_UPLOAD_DIR, old.category, `${old.id}.${old.ext}`);
        await fs.unlink(oldPath).catch(() => {});
      }
    }

    const updates = [];
    const params = [];
    if (newFilename) {
      const category = getFileCategory(req.file.mimetype);
      updates.push('category = ?', 'ext = ?', 'size = ?', 'original_name = ?');
      params.push(category, path.extname(newFilename).slice(1), req.file.size, req.file.originalname);
    }
    ['description', 'status'].forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    });
    if (!updates.length) return res.status(400).json({ message: 'Нет данных для обновления.' });

    params.push(id);
    await pool.promise().execute(
      `UPDATE files SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    res.json({ message: 'Файл обновлён.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка обновления файла.' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const [[file]] = await pool.promise().execute(
      'SELECT category, ext FROM files WHERE id = ?', [id]
    );
    if (!file) return res.status(404).json({ message: 'Файл не найден.' });

    const filePath = path.join(BASE_UPLOAD_DIR, file.category, `${id}.${file.ext}`);
    await fs.unlink(filePath).catch(() => {});
    await pool.promise().execute('DELETE FROM files WHERE id = ?', [id]);
    await pool.promise().execute('DELETE FROM file_tags WHERE file_id = ?', [id]);

    res.json({ message: 'Файл удалён.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка удаления файла.' });
  }
};
