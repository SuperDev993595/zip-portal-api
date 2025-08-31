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
    
    // Process user data (single user object, not array)
    let processedUser = null;
    try {
      // Generate a unique userId if not provided
      const userId = userData.userId || `user-${Date.now()}`;
      
      const existingUser = await User.findOne({ where: { userId: userId } });
      
      if (existingUser) {
        // Update existing user
        await existingUser.update({
          firstName: userData.firstName,
          lastName: userData.lastName,
          birthday: userData.birthday ? new Date(userData.birthday) : null,
          country: userData.country,
          phone: userData.phone,
          avatar: avatarFileName || existingUser.avatar
        });
        processedUser = existingUser;
      } else {
        // Create new user
        processedUser = await User.create({
          userId: userId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          birthday: userData.birthday ? new Date(userData.birthday) : null,
          country: userData.country,
          phone: userData.phone,
          avatar: avatarFileName
        });
      }
    } catch (error) {
      console.error('Error processing user data:', error);
      throw new Error(`Failed to process user data: ${error.message}`);
    }
    
    // Process transactions data (array of transactions)
    const processedTransactions = [];
    for (const transaction of transactionsData) {
      try {
        const existingTransaction = await Transaction.findOne({ 
          where: { reference: transaction.reference } 
        });
        
        if (existingTransaction) {
          // Update existing transaction
          await existingTransaction.update({
            amount: transaction.amount,
            currency: transaction.currency,
            message: transaction.message,
            timestamp: new Date(transaction.timestamp)
          });
          processedTransactions.push(existingTransaction);
        } else {
          // Create new transaction
          const newTransaction = await Transaction.create({
            reference: transaction.reference,
            amount: transaction.amount,
            currency: transaction.currency,
            message: transaction.message,
            timestamp: new Date(transaction.timestamp)
          });
          processedTransactions.push(newTransaction);
        }
      } catch (error) {
        console.error(`Error processing transaction ${transaction.reference}:`, error);
      }
    }
    
    // Clean up temporary files
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
    
    res.json({
      message: 'ZIP file processed successfully',
      userProcessed: !!processedUser,
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
