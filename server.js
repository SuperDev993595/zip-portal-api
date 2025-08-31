const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for avatars)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/upload', require('./routes/upload'));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'ZipPortal Backend API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
async function startServer() {
  try {
    // Try to sync database, but don't fail if MySQL is not available
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully');
      await sequelize.sync({ force: true });
      console.log('Database synced successfully (tables recreated)');
      
      // Try to seed sample data
      try {
        const seedSampleData = require('./seeders/sampleData');
        await seedSampleData();
      } catch (seedError) {
        console.warn('Failed to seed sample data:', seedError.message);
      }
      
    } catch (dbError) {
      if (dbError.parent && dbError.parent.code === 'ER_BAD_DB_ERROR') {
        console.log('Database "zipportal" does not exist. Creating it now...');
        try {
          // Create a connection without specifying database
          const tempSequelize = new (require('sequelize').Sequelize)('', 'root', '', {
            host: 'localhost',
            dialect: 'mysql',
            logging: false
          });
          
          // Create the database
          await tempSequelize.query('CREATE DATABASE IF NOT EXISTS zipportal;');
          console.log('Database "zipportal" created successfully');
          
          // Close temporary connection
          await tempSequelize.close();
          
          // Now try to connect to the new database
          await sequelize.authenticate();
          console.log('Connected to new database successfully');
          
          // Create tables
          await sequelize.sync({ force: true });
          console.log('Tables created successfully (recreated)');
          
          // Try to seed sample data
          try {
            const seedSampleData = require('./seeders/sampleData');
            await seedSampleData();
          } catch (seedError) {
            console.warn('Failed to seed sample data:', seedError.message);
          }
          
        } catch (createError) {
          console.error('Failed to create database:', createError.message);
          console.log('Server will start without database connection');
        }
      } else if (dbError.name === 'SequelizeConnectionError') {
        console.warn('Database connection failed:', dbError.message);
        console.log('Server will start without database connection');
        console.log('To enable full functionality, please start MySQL server');
      } else {
        console.warn('Database error:', dbError.message);
        console.log('Server will start without database connection');
      }
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
}

startServer();
