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
    
    // Debug: List all files in the ZIP
    const zipEntries = zip.getEntries();
    console.log('Files found in ZIP:');
    zipEntries.forEach(entry => {
      console.log(`- ${entry.entryName}`);
    });
    
    // Helper function to find file recursively in directory
    const findFileRecursively = (dir, filename) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          const found = findFileRecursively(fullPath, filename);
          if (found) return found;
        } else if (item.name === filename) {
          return fullPath;
        }
      }
      return null;
    };
    
    // Read and process userData.json
    let userDataPath = findFileRecursively(tempDir, 'userData.json');
    if (!userDataPath) {
      // Try alternative names
      const alternativeNames = ['userdata.json', 'UserData.json', 'USERDATA.json', 'user_data.json'];
      let foundUserData = false;
      
      for (const altName of alternativeNames) {
        userDataPath = findFileRecursively(tempDir, altName);
        if (userDataPath) {
          console.log(`Found user data file with alternative name: ${altName}`);
          foundUserData = true;
          break;
        }
      }
      
      if (!foundUserData) {
        // List all files in temp directory for debugging
        const tempFiles = fs.readdirSync(tempDir);
        console.log('Files in temp directory:', tempFiles);
        throw new Error(`userData.json not found in ZIP file. Available files: ${tempFiles.join(', ')}`);
      }
    }
    
    // Parse userData.json with error handling
    let userData;
    try {
      const userDataContent = fs.readFileSync(userDataPath, 'utf8');
      userData = JSON.parse(userDataContent);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('JSON syntax error in userData.json:', error.message);
        console.log('File content:', fs.readFileSync(userDataPath, 'utf8'));
        throw new Error(`Invalid JSON syntax in userData.json: ${error.message}. Please check the file format.`);
      } else {
        throw new Error(`Failed to read userData.json: ${error.message}`);
      }
    }
    
    // Check if userData.json actually contains transaction data
    if (Array.isArray(userData) && userData.length > 0 && userData[0].reference) {
      console.log('userData.json contains transaction data, treating as transactions file');
      // This is actually transaction data, so we need to find the real user data
      // For now, we'll create a default user and process this as transactions
      const defaultUser = {
        firstName: 'Unknown',
        lastName: 'User',
        birthday: null,
        country: null,
        phone: null
      };
      
      // Process the transactions from userData.json
      const transactionsData = userData;
      
      // Create or update default user
      let processedUser = null;
      try {
        const userId = `default-user-${Date.now()}`;
        processedUser = await User.create({
          userId: userId,
          firstName: defaultUser.firstName,
          lastName: defaultUser.lastName,
          birthday: defaultUser.birthday,
          country: defaultUser.country,
          phone: defaultUser.phone,
          avatar: avatarFileName
        });
      } catch (error) {
        console.error('Error creating default user:', error);
        throw new Error(`Failed to create default user: ${error.message}`);
      }
      
      // Process transactions data
      const processedTransactions = [];
      for (const transaction of transactionsData) {
        try {
          const existingTransaction = await Transaction.findOne({ 
            where: { reference: transaction.reference } 
          });
          
          if (existingTransaction) {
            await existingTransaction.update({
              amount: transaction.amount,
              currency: transaction.currency,
              message: transaction.message,
              timestamp: new Date(transaction.timestamp)
            });
            processedTransactions.push(existingTransaction);
          } else {
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
        message: 'ZIP file processed successfully (userData.json contained transaction data)',
        userProcessed: !!processedUser,
        transactionsProcessed: processedTransactions.length,
        avatarProcessed: !!avatarFileName
      });
      return;
    }
    
    // Read and process transactions.json
    let transactionsPath = findFileRecursively(tempDir, 'transactions.json');
    if (!transactionsPath) {
      // Try alternative names
      const alternativeNames = ['transaction.json', 'Transaction.json', 'TRANSACTION.json', 'transaction_data.json'];
      let foundTransactions = false;
      
      for (const altName of alternativeNames) {
        transactionsPath = findFileRecursively(tempDir, altName);
        if (transactionsPath) {
          console.log(`Found transactions file with alternative name: ${altName}`);
          foundTransactions = true;
          break;
        }
      }
      
      if (!foundTransactions) {
        // List all files in temp directory for debugging
        const tempFiles = fs.readdirSync(tempDir);
        console.log('Files in temp directory:', tempFiles);
        throw new Error(`transactions.json not found in ZIP file. Available files: ${tempFiles.join(', ')}`);
      }
    }
    
    // Parse transactions.json with error handling
    let transactionsData;
    try {
      const transactionsContent = fs.readFileSync(transactionsPath, 'utf8');
      transactionsData = JSON.parse(transactionsContent);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('JSON syntax error in transactions.json:', error.message);
        console.log('File content:', fs.readFileSync(transactionsPath, 'utf8'));
        throw new Error(`Invalid JSON syntax in transactions.json: ${error.message}. Please check the file format.`);
      } else {
        throw new Error(`Failed to read transactions.json: ${error.message}`);
      }
    }
    
    // Process avatar.png if exists
    const avatarPath = findFileRecursively(tempDir, 'avatar.png');
    let avatarFileName = null;
    
    if (avatarPath) {
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
