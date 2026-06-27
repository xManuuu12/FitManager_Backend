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

  /**
   * Crea un nuevo usuario (recepcionista/staff o admin) para un gimnasio existente.
   * El id_gimnasio proviene del token del admin que realiza la acción.
   */
  async createStaff({ nombre, email, password, id_gimnasio, rol }) {
    // Validamos que el rol sea uno de los permitidos por el modelo
    const rolesPermitidos = ['admin', 'recepcion'];
    const finalRol = rolesPermitidos.includes(rol) ? rol : 'recepcion';

    // Validamos que el email no esté ya registrado en este gimnasio
    const userExists = await User.findOne({ where: { email, id_gimnasio } });
    if (userExists) {
      throw new Error('El email ya está registrado en este gimnasio');
    }

    const user = await User.create({
      nombre,
      email,
      password,
      id_gimnasio,
      rol: finalRol
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

  /**
   * Obtiene la lista de usuarios pertenecientes a un gimnasio específico.
   * Filtra por id_gimnasio y excluye la contraseña de la respuesta.
   */
  async getUsers(id_gimnasio) {
    return await User.findAll({
      where: { id_gimnasio },
      attributes: { exclude: ['password'] }, // Seguridad: no enviar el hash
      order: [['nombre', 'ASC']]
    });
  }

  /**
   * Actualiza un usuario del gimnasio. SaaS-safe: solo busca dentro del id_gimnasio
   * del admin autenticado, así nunca puede tocar usuarios de otro gimnasio.
   * El password se re-hashea automáticamente vía el hook beforeUpdate del modelo.
   */
  async updateUser(id_gimnasio, id_usuario, updateData) {
    // 1. Buscar el usuario DENTRO del gimnasio (aislamiento de tenant)
    const user = await User.findOne({ where: { id_usuario, id_gimnasio } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // 2. Campos que NUNCA se pueden cambiar por esta vía
    delete updateData.id_gimnasio;
    delete updateData.id_usuario;

    // 3. Si el password viene vacío o ausente, no lo tocamos
    if (!updateData.password) {
      delete updateData.password;
    }

    // 4. Validar el rol si viene
    if (updateData.rol && !['admin', 'recepcion'].includes(updateData.rol)) {
      throw new Error('Rol inválido');
    }

    // 5. Email único por gimnasio (solo si cambió)
    if (updateData.email && updateData.email !== user.email) {
      const emailEnUso = await User.findOne({
        where: { email: updateData.email, id_gimnasio }
      });
      if (emailEnUso) {
        throw new Error('El email ya está registrado en este gimnasio');
      }
    }

    // 6. Guardar (el hook beforeUpdate hashea el password si cambió)
    await user.update(updateData);

    const userData = user.toJSON();
    delete userData.password; // Seguridad: nunca devolver el hash
    return userData;
  }

  /**
   * Elimina (borrado físico) un usuario del gimnasio del admin autenticado.
   * Guardas anti-lockout: no permite auto-eliminarse ni borrar al único admin.
   * @param {number} solicitanteId - id_usuario del admin que ejecuta la acción.
   */
  async deleteUser(id_gimnasio, id_usuario, solicitanteId) {
    // 1. Anti-lockout: no podés eliminar tu propio usuario
    if (parseInt(id_usuario, 10) === parseInt(solicitanteId, 10)) {
      throw new Error('No puedes eliminar tu propio usuario');
    }

    // 2. SaaS-safe: buscar dentro del gimnasio
    const user = await User.findOne({ where: { id_usuario, id_gimnasio } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // 3. Anti-lockout: no dejar al gimnasio sin ningún administrador
    if (user.rol === 'admin') {
      const totalAdmins = await User.count({ where: { id_gimnasio, rol: 'admin' } });
      if (totalAdmins <= 1) {
        throw new Error('No puedes eliminar al único administrador del gimnasio');
      }
    }

    await user.destroy();
    return { id_usuario: user.id_usuario };
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
