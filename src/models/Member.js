const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Member = sequelize.define('Member', {
  id_miembro: {
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
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  estado: {
    type: DataTypes.ENUM('activo', 'vencido'),
    defaultValue: 'vencido',
  }
}, {
  tableName: 'miembros',
  timestamps: true,        // 1. Actívalo para que Sequelize maneje las fechas
  underscored: true,       // 2. IMPORTANTE: Esto le dice que use nombres con guion bajo (_)
  createdAt: 'fecha_registro', // 3. Mapea fecha_registro como el createdAt
  updatedAt: 'updated_at',     // 4. Mapea updated_at como el updatedAt
  deletedAt: 'deleted_at',
  paranoid: false,
});

module.exports = Member;