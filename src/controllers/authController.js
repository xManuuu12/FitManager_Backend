const authService = require('../services/authService');

exports.register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    sendTokenResponse(user, 201, res);
  } catch (error) {
    if (error.message.includes('id_gimnasio')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y password requeridos' });
    }

    const user = await authService.login(email, password);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    if (error.message === 'Credenciales inválidas') {
      return res.status(401).json({ success: false, error: error.message });
    }
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id_usuario, req.user.id_gimnasio);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = authService.generateToken(user);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  const userData = user.toJSON();
  delete userData.password;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: userData
    });
};

exports.logout = (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};
