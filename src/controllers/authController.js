const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res, next) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const user = await User.create({ nombre, email, password, rol });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y password requeridos' });
    }
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id_usuario);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user.id_usuario }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
  const userData = user.toJSON();
  delete userData.password;
  res.status(statusCode).json({ success: true, token, user: userData });
};
