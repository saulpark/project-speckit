/**
 * Migration: Add Note Sharing Support
 * Spec: 004-note-sharing
 * Date: 2026-03-11
 *
 * This migration adds the sharedWith field to existing notes and creates
 * necessary indexes for optimal sharing query performance.
 */

const { MongoClient } = require('mongodb');

// Migration configuration
const MIGRATION_NAME = '004-add-note-sharing';
const DATABASE_NAME = process.env.DB_NAME || 'speckit';

async function up(db) {
  console.log(`[${MIGRATION_NAME}] Starting migration...`);

  try {
    // Step 1: Add sharedWith field to existing notes
    console.log('Adding sharedWith field to existing notes...');
    const notesUpdateResult = await db.collection('notes').updateMany(
      { sharedWith: { $exists: false } },
      { $set: { sharedWith: [] } }
    );
    console.log(`Updated ${notesUpdateResult.modifiedCount} notes with sharedWith field`);

    // Step 2: Create performance indexes
    console.log('Creating performance indexes...');

    // Index for shared note lookups (user viewing shared notes)
    await db.collection('notes').createIndex(
      { 'sharedWith.userId': 1 },
      {
        name: 'sharedWith_userId_1',
        background: true
      }
    );
    console.log('Created index: sharedWith.userId');

    // Compound index for shared notes by user and date
    await db.collection('notes').createIndex(
      { 'sharedWith.userId': 1, updatedAt: -1 },
      {
        name: 'sharedWith_userId_1_updatedAt_-1',
        background: true
      }
    );
    console.log('Created compound index: sharedWith.userId + updatedAt');

    // Ensure public notes index exists (may already exist from previous migrations)
    await db.collection('notes').createIndex(
      { isPublic: 1, updatedAt: -1 },
      {
        name: 'isPublic_1_updatedAt_-1',
        background: true
      }
    );
    console.log('Ensured public notes index exists');

    console.log(`[${MIGRATION_NAME}] Migration completed successfully`);

  } catch (error) {
    console.error(`[${MIGRATION_NAME}] Migration failed:`, error);
    throw error;
  }
}

async function down(db) {
  console.log(`[${MIGRATION_NAME}] Starting rollback...`);

  try {
    // Remove the sharedWith field from all notes
    console.log('Removing sharedWith field from notes...');
    const notesUpdateResult = await db.collection('notes').updateMany(
      { sharedWith: { $exists: true } },
      { $unset: { sharedWith: 1 } }
    );
    console.log(`Removed sharedWith field from ${notesUpdateResult.modifiedCount} notes`);

    // Remove the indexes we created
    console.log('Removing sharing-related indexes...');

    try {
      await db.collection('notes').dropIndex('sharedWith_userId_1');
      console.log('Dropped index: sharedWith_userId_1');
    } catch (err) {
      console.log('Index sharedWith_userId_1 not found (may have been dropped)');
    }

    try {
      await db.collection('notes').dropIndex('sharedWith_userId_1_updatedAt_-1');
      console.log('Dropped index: sharedWith_userId_1_updatedAt_-1');
    } catch (err) {
      console.log('Index sharedWith_userId_1_updatedAt_-1 not found (may have been dropped)');
    }

    console.log(`[${MIGRATION_NAME}] Rollback completed successfully`);

  } catch (error) {
    console.error(`[${MIGRATION_NAME}] Rollback failed:`, error);
    throw error;
  }
}

async function test(db) {
  console.log(`[${MIGRATION_NAME}] Running migration tests...`);

  try {
    // Test 1: Verify all notes have sharedWith field
    const notesWithoutSharedWith = await db.collection('notes').countDocuments({
      sharedWith: { $exists: false }
    });

    if (notesWithoutSharedWith > 0) {
      throw new Error(`Found ${notesWithoutSharedWith} notes without sharedWith field`);
    }
    console.log('✓ All notes have sharedWith field');

    // Test 2: Verify sharedWith field is an array
    const notesWithInvalidSharedWith = await db.collection('notes').countDocuments({
      sharedWith: { $not: { $type: 'array' } }
    });

    if (notesWithInvalidSharedWith > 0) {
      throw new Error(`Found ${notesWithInvalidSharedWith} notes with invalid sharedWith type`);
    }
    console.log('✓ All sharedWith fields are arrays');

    // Test 3: Verify required indexes exist
    const indexes = await db.collection('notes').listIndexes().toArray();
    const indexNames = indexes.map(idx => idx.name);

    const requiredIndexes = [
      'sharedWith_userId_1',
      'sharedWith_userId_1_updatedAt_-1'
    ];

    for (const indexName of requiredIndexes) {
      if (!indexNames.includes(indexName)) {
        throw new Error(`Required index missing: ${indexName}`);
      }
    }
    console.log('✓ All required indexes exist');

    // Test 4: Test sharing query performance
    const startTime = Date.now();
    await db.collection('notes').find({ 'sharedWith.userId': { $exists: true } }).limit(1).toArray();
    const queryTime = Date.now() - startTime;

    if (queryTime > 100) {
      console.warn(`Sharing query took ${queryTime}ms - consider index optimization`);
    } else {
      console.log(`✓ Sharing query performance: ${queryTime}ms`);
    }

    console.log(`[${MIGRATION_NAME}] All tests passed`);

  } catch (error) {
    console.error(`[${MIGRATION_NAME}] Test failed:`, error);
    throw error;
  }
}

// CLI interface for running migration
async function runMigration() {
  const action = process.argv[2] || 'up';

  if (!['up', 'down', 'test'].includes(action)) {
    console.error('Usage: node 004-add-note-sharing.js [up|down|test]');
    process.exit(1);
  }

  const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DATABASE_NAME);

    switch (action) {
      case 'up':
        await up(db);
        break;
      case 'down':
        await down(db);
        break;
      case 'test':
        await test(db);
        break;
    }

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Export functions for programmatic use
module.exports = {
  up,
  down,
  test,
  MIGRATION_NAME
};

// Run if called directly
if (require.main === module) {
  runMigration();
}