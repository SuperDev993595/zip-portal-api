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
      await sequelize.sync({ force: false });
      console.log('Database synced successfully');
    } catch (dbError) {
      if (dbError.parent && dbError.parent.code === 'ER_BAD_DB_ERROR') {
        console.warn('Database "zipportal" does not exist');
        console.log('To create the database, run: CREATE DATABASE zipportal;');
        console.log('Server will start without database connection');
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
