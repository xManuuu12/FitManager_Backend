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

/**
 * Crea un nuevo empleado (staff/recepcion) para el gimnasio del administrador.
 * Toma el id_gimnasio del token del admin autenticado.
 */
exports.createStaff = async (req, res, next) => {
  try {
    const { nombre, email, password, rol } = req.body;

    const user = await authService.createStaff({
      nombre,
      email,
      password,
      rol,
      id_gimnasio: req.user.id_gimnasio // Forzamos el ID del gimnasio del token
    });

    const userData = user.toJSON();
    delete userData.password;

    res.status(201).json({
      success: true,
      data: userData
    });
  } catch (error) {
    if (error.message.includes('ya está registrado')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * Actualiza un usuario del gimnasio del admin autenticado.
 */
exports.updateUser = async (req, res, next) => {
  try {
    const user = await authService.updateUser(
      req.user.id_gimnasio,
      req.params.id,
      req.body
    );
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('ya está registrado') || error.message === 'Rol inválido') {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * Elimina un usuario del gimnasio del admin autenticado.
 */
exports.deleteUser = async (req, res, next) => {
  try {
    await authService.deleteUser(
      req.user.id_gimnasio,
      req.params.id,
      req.user.id_usuario
    );
    res.status(200).json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('No puedes eliminar')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * Obtiene todos los usuarios del gimnasio del usuario autenticado.
 */
exports.getUsers = async (req, res, next) => {
  try {
    const users = await authService.getUsers(req.user.id_gimnasio);
    res.status(200).json({ success: true, count: users.length, data: users });
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
