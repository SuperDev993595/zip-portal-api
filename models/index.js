const sequelize = require('../config/database');
const User = require('./User');
const Transaction = require('./Transaction');

// Define relationships
User.hasMany(Transaction, { foreignKey: 'userId', sourceKey: 'userId' });
Transaction.belongsTo(User, { foreignKey: 'userId', targetKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Transaction
};
