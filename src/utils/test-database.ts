import { database } from '../config/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');

  try {
    // Test connection
    await database.connect();
    console.log('✅ Database connection successful');

    // Test health check
    const health = await database.healthCheck();
    console.log('🔍 Health check result:', health);

    if (health.connected) {
      console.log('✅ T1.3 - Database Foundation: PASSED');
      console.log(`📍 Connected to database: ${health.database}`);
    } else {
      console.log('❌ T1.3 - Database Foundation: FAILED - Health check failed');
    }

  } catch (error) {
    console.error('❌ T1.3 - Database Foundation: FAILED');
    console.error('Error details:', error);
  } finally {
    // Clean up
    try {
      await database.disconnect();
      console.log('🧹 Database connection closed');
    } catch (disconnectError) {
      console.error('❌ Error during cleanup:', disconnectError);
    }
  }
}

// Run the test
testDatabaseConnection();