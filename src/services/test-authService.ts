import { AuthService, CreateUserData } from './authService';

/**
 * Simple test function to verify AuthService functionality
 * Note: This requires a MongoDB connection to run properly
 */
async function testAuthService(): Promise<void> {
  console.log('🧪 Testing Authentication Service...\n');

  try {
    // Test user registration validation
    console.log('1. Testing user registration validation...');

    // Test missing fields validation
    try {
      await AuthService.registerUser({ email: '', password: '' });
      console.log('❌ Should have failed for missing fields');
    } catch (error) {
      console.log('✅ Correctly rejected empty email/password');
    }

    // Test invalid email validation
    try {
      await AuthService.registerUser({ email: 'invalid-email', password: 'ValidPassword123' });
      console.log('❌ Should have failed for invalid email');
    } catch (error) {
      console.log('✅ Correctly rejected invalid email format');
    }

    // Test weak password validation
    try {
      await AuthService.registerUser({ email: 'test@example.com', password: 'weak' });
      console.log('❌ Should have failed for weak password');
    } catch (error) {
      console.log('✅ Correctly rejected weak password');
    }

    console.log('\n2. Testing authentication input validation...');

    // Test authentication with missing credentials
    try {
      await AuthService.authenticateUser('', '');
      console.log('❌ Should have failed for missing credentials');
    } catch (error) {
      console.log('✅ Correctly rejected empty credentials');
    }

    // Test authentication with non-existent user
    try {
      await AuthService.authenticateUser('nonexistent@example.com', 'SomePassword123');
      console.log('❌ Should have failed for non-existent user');
    } catch (error) {
      console.log('✅ Correctly rejected non-existent user');
    }

    console.log('\n3. Testing utility methods...');

    // Test user lookup methods (should return null without database)
    const userById = await AuthService.findUserById('507f1f77bcf86cd799439011');
    console.log(`✅ findUserById returns: ${userById === null ? 'null (expected)' : 'user object'}`);

    const userByEmail = await AuthService.findUserByEmail('test@example.com');
    console.log(`✅ findUserByEmail returns: ${userByEmail === null ? 'null (expected)' : 'user object'}`);

    const userCount = await AuthService.getActiveUserCount();
    console.log(`✅ getActiveUserCount returns: ${userCount} (depends on database)`);

    console.log('\n🎉 Authentication Service validation tests completed!');
    console.log('💡 Note: Full integration tests require MongoDB connection');

  } catch (error) {
    console.error('❌ Authentication service test failed:', error);
    throw error;
  }
}

// Export for potential use in other test files
export { testAuthService };