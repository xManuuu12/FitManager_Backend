const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');
const Gimnasio = require('./Gimnasio');

const User = sequelize.define('User', {
  id_usuario: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_gimnasio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gimnasios',
      key: 'id_gimnasio'
    }
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  rol: {
    type: DataTypes.ENUM('admin', 'recepcion'),
    defaultValue: 'recepcion',
  }
}, {
  tableName: 'usuarios',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['email', 'id_gimnasio']
    }
  ]
});

// Relaciones
User.belongsTo(Gimnasio, { foreignKey: 'id_gimnasio', as: 'gimnasio' });
Gimnasio.hasMany(User, { foreignKey: 'id_gimnasio' });

User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Hook para encriptar antes de guardar
User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

module.exports = User;
