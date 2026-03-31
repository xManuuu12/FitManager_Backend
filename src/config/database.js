const { Sequelize } = require('sequelize');
require('dotenv').config();

// Priorizamos la URL pública de Railway si existe
const connectionString = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;

let sequelize;

if (connectionString) {
  // CONFIGURACIÓN PARA PRODUCCIÓN (Vercel/Railway)
  sequelize = new Sequelize(connectionString, {
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Esto evita errores de certificado en Railway
      }
    },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  });
} else {
  // CONFIGURACIÓN PARA LOCALHOST
  sequelize = new Sequelize(
    process.env.DB_NAME || 'fitmanager_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      dialectModule: require('mysql2'),
      logging: false
    }
  );
}

module.exports = sequelize;