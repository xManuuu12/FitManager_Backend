const User = require('../models/User');
const Gimnasio = require('../models/Gimnasio');
const jwt = require('jsonwebtoken');

class AuthService {
  async register({ nombre, email, password, nombreGimnasio, id_gimnasio, rol }) {
    let gymId = id_gimnasio;

    // Si es un nuevo cliente SaaS, creamos el gimnasio primero
    if (!gymId && nombreGimnasio) {
      const gimnasio = await Gimnasio.create({ nombre: nombreGimnasio });
      gymId = gimnasio.id_gimnasio;
    }

    if (!gymId) {
      throw new Error('Se requiere id_gimnasio o nombreGimnasio');
    }

    const user = await User.create({
      nombre,
      email,
      password,
      id_gimnasio: gymId,
      rol: rol || 'admin'
    });

    return user;
  }

  async login(email, password) {
    const user = await User.findOne({ where: { email } });
    
    if (!user || !(await user.matchPassword(password))) {
      throw new Error('Credenciales inválidas');
    }

    return user;
  }

  async getUserById(id_usuario, id_gimnasio) {
    const user = await User.findByPk(id_usuario, {
      include: [{ 
        model: Gimnasio, 
        as: 'gimnasio',
        where: { id_gimnasio }
      }]
    });
    return user;
  }

  generateToken(user) {
    return jwt.sign(
      { 
        id_usuario: user.id_usuario, 
        id_gimnasio: user.id_gimnasio,
        rol: user.rol 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }
}

module.exports = new AuthService();
