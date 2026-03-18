#!/usr/bin/env node

/**
 * Database Migration: Add User Management Fields
 *
 * This script adds new fields to existing user documents for user management functionality:
 * - role: default 'user'
 * - displayName: null (optional)
 * - passwordChangedAt: null
 * - deactivatedAt: null
 * - lastLoginAt: null
 *
 * This migration is idempotent and can be run multiple times safely.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/speckit';

async function runMigration() {
  try {
    console.log('🔄 Starting user management fields migration...');
    console.log('📡 Connecting to MongoDB:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Check current user count
    const totalUsers = await usersCollection.countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log('ℹ️  No users found. Migration not needed.');
      return;
    }

    // Check how many users already have the new fields
    const usersWithoutRole = await usersCollection.countDocuments({ role: { $exists: false } });
    console.log(`🔍 Users without role field: ${usersWithoutRole}`);

    if (usersWithoutRole === 0) {
      console.log('✅ All users already have user management fields. Migration already completed.');
      return;
    }

    console.log(`🚀 Updating ${usersWithoutRole} user documents with new fields...`);

    // Update users that don't have the new fields
    const migrationResult = await usersCollection.updateMany(
      { role: { $exists: false } },
      {
        $set: {
          role: 'user',
          displayName: null,
          passwordChangedAt: null,
          deactivatedAt: null,
          lastLoginAt: null
        }
      }
    );

    console.log(`✅ Migration completed successfully!`);
    console.log(`   - Documents matched: ${migrationResult.matchedCount}`);
    console.log(`   - Documents updated: ${migrationResult.modifiedCount}`);

    // Verify migration
    const verification = await usersCollection.countDocuments({ role: { $exists: true } });
    console.log(`🔍 Verification: ${verification}/${totalUsers} users now have role field`);

    if (verification === totalUsers) {
      console.log('✅ Migration verification successful!');
    } else {
      console.warn('⚠️  Migration verification failed. Some users may not have been updated.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function rollbackMigration() {
  try {
    console.log('🔄 Starting rollback of user management fields migration...');
    console.log('📡 Connecting to MongoDB:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    console.log('🔄 Removing user management fields from all users...');

    const rollbackResult = await usersCollection.updateMany(
      {},
      {
        $unset: {
          role: 1,
          displayName: 1,
          passwordChangedAt: 1,
          deactivatedAt: 1,
          lastLoginAt: 1
        }
      }
    );

    console.log(`✅ Rollback completed!`);
    console.log(`   - Documents matched: ${rollbackResult.matchedCount}`);
    console.log(`   - Documents updated: ${rollbackResult.modifiedCount}`);

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// CLI handling
const command = process.argv[2];

if (command === '--rollback') {
  rollbackMigration();
} else if (command === '--help' || command === '-h') {
  console.log(`
User Management Fields Migration

Usage:
  node add-user-management-fields.js          # Run migration
  node add-user-management-fields.js --rollback  # Rollback migration
  node add-user-management-fields.js --help      # Show this help

Environment Variables:
  MONGODB_URI - MongoDB connection string (required)

This migration adds user management fields to existing user documents:
- role: 'user' | 'admin' (default: 'user')
- displayName: optional display name (default: null)
- passwordChangedAt: timestamp of last password change (default: null)
- deactivatedAt: timestamp when account was deactivated (default: null)
- lastLoginAt: timestamp of last login (default: null)
  `);
} else {
  runMigration();
}