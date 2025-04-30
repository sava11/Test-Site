// controllers/fileController.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

// Базовая папка для загрузок по категориям
const BASE_UPLOAD_DIR = path.join(__dirname, '../uploads');

// Определить категорию файла по MIME-типу
function getFileCategory(mimetype) {
  if (/^image\//.test(mimetype)) return 'images';
  if (/^video\//.test(mimetype)) return 'videos';
  if (/^audio\//.test(mimetype)) return 'audio';
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

// Загрузка нескольких файлов
exports.uploadFiles = upload.array('files', 10);

// Обработка сохранённых файлов
exports.handleFiles = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(400).json({ message: 'Нет файлов для обработки.' });
    }

    const results = [];
    for (const file of req.files) {
      const { filename, mimetype, size, path: filepath, originalname } = file;
      const fileId = path.parse(filename).name;
      const category = getFileCategory(mimetype);

      // Возможные действия с файлом:
      // 1) Переместить/копировать файл в финальную директорию
      // 2) Создать превью/thumbnail для изображений и видео
      // 3) Конвертировать аудио/видео в нужный формат
      // 4) Индексировать текстовые файлы или извлекать метаданные
      // 5) Сохранить информацию о файле (metadata) в БД или кэше
      // 6) Проверить и удалить (или архивировать) старые или ненужные файлы

      // Пример: сформировать публичный URL или путь для клиента
      const publicUrl = `/uploads/${category}/${filename}`;
      results.push({ id: fileId, originalName: originalname, url: publicUrl });
    }

    return res.status(200).json({ message: 'Файлы обработаны.', files: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка обработки файлов.' });
  }
};
