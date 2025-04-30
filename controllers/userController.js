const userModel = require('../models/userModel');

exports.getUser = async (req, res) => {
    const { login } = req.params;
    const page_user = await userModel.findByLogin(login);
    res.render('user/user', { 
        title:"пользователь "+login,
        page_user:page_user||null,
        // self_user: req.session.user||null,
    });
    }
exports.postDeleteUser = async (req, res) => {
    const { login } = req.params;
    if (req.session.user.login==login)
      try {
        userModel.deleteUserByLogin(login);
        req.session.destroy(err => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка при завершении сессии' });
          }
          res.json({ success: true });
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
}