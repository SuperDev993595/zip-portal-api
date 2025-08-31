const { User, Transaction } = require('../models');

const seedSampleData = async () => {
  try {
    console.log('Seeding sample data...');

    // Create sample users
    const sampleUsers = [
      {
        userId: 'user-001',
        firstName: 'John',
        lastName: 'Doe',
        birthday: '1990-05-15',
        country: 'US',
        phone: '1234567890',
        avatar: null
      },
      {
        userId: 'user-002',
        firstName: 'Jane',
        lastName: 'Smith',
        birthday: '1985-08-22',
        country: 'CA',
        phone: '9876543210',
        avatar: null
      },
      {
        userId: 'user-003',
        firstName: 'Bob',
        lastName: 'Johnson',
        birthday: '1992-12-10',
        country: 'UK',
        phone: '5551234567',
        avatar: null
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ where: { userId: userData.userId } });
      if (!existingUser) {
        await User.create(userData);
        console.log(`Created user: ${userData.firstName} ${userData.lastName}`);
      }
    }

    // Create sample transactions
    const sampleTransactions = [
      {
        reference: 'txn-001-2025',
        amount: 150.00,
        currency: 'USD',
        message: 'Online purchase',
        timestamp: '2025-01-15T10:30:00Z'
      },
      {
        reference: 'txn-002-2025',
        amount: 75.50,
        currency: 'EUR',
        message: 'Service payment',
        timestamp: '2025-01-16T14:20:00Z'
      },
      {
        reference: 'txn-003-2025',
        amount: 200.00,
        currency: 'USD',
        message: 'Subscription renewal',
        timestamp: '2025-01-17T09:15:00Z'
      },
      {
        reference: 'txn-004-2025',
        amount: 45.25,
        currency: 'GBP',
        message: 'Utility bill',
        timestamp: '2025-01-18T16:45:00Z'
      }
    ];

    for (const transactionData of sampleTransactions) {
      const existingTransaction = await Transaction.findOne({ 
        where: { reference: transactionData.reference } 
      });
      if (!existingTransaction) {
        await Transaction.create(transactionData);
        console.log(`Created transaction: ${transactionData.reference}`);
      }
    }

    console.log('Sample data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding sample data:', error);
    throw error;
  }
};

module.exports = seedSampleData;
