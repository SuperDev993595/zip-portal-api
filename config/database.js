const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('zipportal', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  // Handle missing database gracefully
  retry: {
    max: 3,
    backoffBase: 1000
  }
});

module.exports = sequelize;