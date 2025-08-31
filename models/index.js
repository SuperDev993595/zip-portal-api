const sequelize = require('../config/database');
const User = require('./User');
const Transaction = require('./Transaction');

// No associations needed for the new structure
// Transactions are standalone records without user relationships

module.exports = {
  sequelize,
  User,
  Transaction
};
