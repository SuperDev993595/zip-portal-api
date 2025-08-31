# ZipPortal Backend

A Node.js backend application for processing ZIP files containing user data and transactions.

## Features

- RESTful API for users and transactions
- ZIP file upload and processing
- MySQL database integration with Sequelize ORM
- File handling for avatars and data extraction

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   - Create a MySQL database named `zipportal`
   - Update database credentials in `config/database.js` if needed

3. **Environment Variables:**
   - Create a `.env` file with your database credentials (optional)

4. **Run the application:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/user/:userId` - Get transactions by user

### Upload
- `POST /api/upload` - Upload and process ZIP file

## ZIP File Structure

The application expects ZIP files to contain:
- `userData.json` - User information
- `transactions.json` - Transaction data
- `avatar.png` - User avatar (optional)

## Database Schema

### Users Table
- id (Primary Key)
- userId (Unique)
- name
- email (Unique)
- avatar
- role
- status
- createdAt
- updatedAt

### Transactions Table
- id (Primary Key)
- transactionId (Unique)
- userId (Foreign Key)
- amount
- type
- description
- status
- date
- createdAt
- updatedAt
