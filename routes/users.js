const express = require('express');
const router = express.Router();
const { User } = require('../models');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    if (error.name === 'SequelizeConnectionError') {
      res.status(503).json({ error: 'Database not available', message: 'Please start MySQL server' });
    } else {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { userId: req.params.id }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ where: { userId: req.params.id } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.update(req.body);
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ where: { userId: req.params.id } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
