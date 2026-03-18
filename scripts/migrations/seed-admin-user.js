#!/usr/bin/env node

/**
 * Admin User Seeding Script
 *
 * Creates an initial admin user account if one doesn't exist.
 * Requires ADMIN_EMAIL and ADMIN_PASSWORD environment variables.
 *
 * This script is idempotent and can be run multiple times safely.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/speckit';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function seedAdminUser() {
  try {
    console.log('🔄 Starting admin user seeding...');

    // Validate environment variables
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
      console.log('ℹ️  Set these in your .env file:');
      console.log('   ADMIN_EMAIL=admin@example.com');
      console.log('   ADMIN_PASSWORD=your-secure-password');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ADMIN_EMAIL)) {
      console.error('❌ ADMIN_EMAIL must be a valid email address');
      process.exit(1);
    }

    // Validate password strength
    if (ADMIN_PASSWORD.length < 8) {
      console.error('❌ ADMIN_PASSWORD must be at least 8 characters long');
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Check if admin user already exists
    const existingAdmin = await usersCollection.findOne({
      email: ADMIN_EMAIL.toLowerCase().trim()
    });

    if (existingAdmin) {
      console.log(`ℹ️  Admin user with email ${ADMIN_EMAIL} already exists`);

      // Update to admin role if not already admin
      if (existingAdmin.role !== 'admin') {
        console.log('🔄 Updating existing user to admin role...');
        await usersCollection.updateOne(
          { _id: existingAdmin._id },
          {
            $set: {
              role: 'admin',
              updatedAt: new Date()
            }
          }
        );
        console.log('✅ User role updated to admin');
      } else {
        console.log('✅ User already has admin role');
      }

      return;
    }

    console.log(`🚀 Creating new admin user: ${ADMIN_EMAIL}`);

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

    // Create admin user document
    const adminUser = {
      email: ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash: passwordHash,
      isActive: true,
      role: 'admin',
      displayName: 'Administrator',
      passwordChangedAt: null,
      deactivatedAt: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert admin user
    const result = await usersCollection.insertOne(adminUser);
    console.log('✅ Admin user created successfully!');
    console.log(`   - User ID: ${result.insertedId}`);
    console.log(`   - Email: ${ADMIN_EMAIL}`);
    console.log(`   - Role: admin`);

    // Verify creation
    const verification = await usersCollection.findOne({ _id: result.insertedId });
    if (verification && verification.role === 'admin') {
      console.log('✅ Admin user verification successful!');
    } else {
      console.warn('⚠️  Admin user verification failed');
    }

  } catch (error) {
    console.error('❌ Admin user seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function listAdminUsers() {
  try {
    console.log('📋 Listing admin users...');
    console.log('📡 Connecting to MongoDB:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const adminUsers = await usersCollection.find(
      { role: 'admin' },
      { projection: { email: 1, displayName: 1, isActive: 1, createdAt: 1 } }
    ).toArray();

    if (adminUsers.length === 0) {
      console.log('ℹ️  No admin users found');
    } else {
      console.log(`📊 Found ${adminUsers.length} admin user(s):`);
      adminUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.displayName || 'No display name'})`);
        console.log(`      - Active: ${user.isActive}`);
        console.log(`      - Created: ${user.createdAt?.toISOString() || 'Unknown'}`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to list admin users:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function removeAdminUser() {
  try {
    if (!ADMIN_EMAIL) {
      console.error('❌ ADMIN_EMAIL environment variable is required for removal');
      process.exit(1);
    }

    console.log(`🔄 Removing admin user: ${ADMIN_EMAIL}`);
    console.log('📡 Connecting to MongoDB:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const result = await usersCollection.deleteOne({
      email: ADMIN_EMAIL.toLowerCase().trim(),
      role: 'admin'
    });

    if (result.deletedCount === 1) {
      console.log('✅ Admin user removed successfully');
    } else {
      console.log('ℹ️  No admin user found with that email');
    }

  } catch (error) {
    console.error('❌ Failed to remove admin user:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// CLI handling
const command = process.argv[2];

if (command === '--list') {
  listAdminUsers();
} else if (command === '--remove') {
  removeAdminUser();
} else if (command === '--help' || command === '-h') {
  console.log(`
Admin User Seeding Script

Usage:
  node seed-admin-user.js              # Create admin user
  node seed-admin-user.js --list       # List existing admin users
  node seed-admin-user.js --remove     # Remove admin user
  node seed-admin-user.js --help       # Show this help

Environment Variables:
  MONGODB_URI    - MongoDB connection string (required)
  ADMIN_EMAIL    - Admin user email address (required)
  ADMIN_PASSWORD - Admin user password (required, min 8 characters)

Example .env configuration:
  MONGODB_URI=mongodb://localhost:27017/speckit
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=SecureAdminPassword123!

This script creates an admin user with full administrative privileges.
The password will be securely hashed with bcrypt before storage.
  `);
} else {
  seedAdminUser();
}