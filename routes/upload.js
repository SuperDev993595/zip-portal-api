const express = require('express');
const router = express.Router();
const multer = require('multer');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const { User, Transaction } = require('../models');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload and process ZIP file
router.post('/', upload.single('zipFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No ZIP file uploaded' });
    }

    const zipPath = req.file.path;
    const zip = new AdmZip(zipPath);
    
    // Extract ZIP contents
    const tempDir = path.join(__dirname, '../temp', Date.now().toString());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    zip.extractAllTo(tempDir, true);
    
    // Read and process userData.json
    const userDataPath = path.join(tempDir, 'userData.json');
    if (!fs.existsSync(userDataPath)) {
      throw new Error('userData.json not found in ZIP file');
    }
    
    const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    
    // Read and process transactions.json
    const transactionsPath = path.join(tempDir, 'transactions.json');
    if (!fs.existsSync(transactionsPath)) {
      throw new Error('transactions.json not found in ZIP file');
    }
    
    const transactionsData = JSON.parse(fs.readFileSync(transactionsPath, 'utf8'));
    
    // Process avatar.png if exists
    const avatarPath = path.join(tempDir, 'avatar.png');
    let avatarFileName = null;
    
    if (fs.existsSync(avatarPath)) {
      avatarFileName = `avatar-${Date.now()}.png`;
      const newAvatarPath = path.join(__dirname, '../uploads', avatarFileName);
      fs.copyFileSync(avatarPath, newAvatarPath);
    }
    
    // Process users data
    const processedUsers = [];
    for (const user of userData) {
      try {
        const existingUser = await User.findOne({ where: { userId: user.userId } });
        
        if (existingUser) {
          // Update existing user
          await existingUser.update({
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            avatar: avatarFileName || user.avatar
          });
          processedUsers.push(existingUser);
        } else {
          // Create new user
          const newUser = await User.create({
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            avatar: avatarFileName || user.avatar
          });
          processedUsers.push(newUser);
        }
      } catch (error) {
        console.error(`Error processing user ${user.userId}:`, error);
      }
    }
    
    // Process transactions data
    const processedTransactions = [];
    for (const transaction of transactionsData) {
      try {
        const existingTransaction = await Transaction.findOne({ 
          where: { transactionId: transaction.transactionId } 
        });
        
        if (existingTransaction) {
          // Update existing transaction
          await existingTransaction.update({
            userId: transaction.userId,
            amount: transaction.amount,
            type: transaction.type,
            description: transaction.description,
            status: transaction.status,
            date: new Date(transaction.date)
          });
          processedTransactions.push(existingTransaction);
        } else {
          // Create new transaction
          const newTransaction = await Transaction.create({
            transactionId: transaction.transactionId,
            userId: transaction.userId,
            amount: transaction.amount,
            type: transaction.type,
            description: transaction.description,
            status: transaction.status,
            date: new Date(transaction.date)
          });
          processedTransactions.push(newTransaction);
        }
      } catch (error) {
        console.error(`Error processing transaction ${transaction.transactionId}:`, error);
      }
    }
    
    // Clean up temporary files
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
    
    res.json({
      message: 'ZIP file processed successfully',
      usersProcessed: processedUsers.length,
      transactionsProcessed: processedTransactions.length,
      avatarProcessed: !!avatarFileName
    });
    
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    res.status(500).json({ 
      error: 'Failed to process ZIP file',
      details: error.message 
    });
  }
});

module.exports = router;
