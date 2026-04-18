require('dotenv').config();
process.env.TZ = 'America/Mexico_City';

const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test the database connection
    await sequelize.authenticate();
    console.log('Connection to MySQL has been established successfully.');

    // sync has been removed to give the user absolute control over the database.
    // Ensure your MySQL tables match the models defined in src/models/


    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:');
    console.error(error.message);
    
    // Start server even if DB connection fails so user can see it's working
    console.log('Starting server in offline mode (without database)...');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (Offline Mode)`);
    });
  }
}

startServer();
