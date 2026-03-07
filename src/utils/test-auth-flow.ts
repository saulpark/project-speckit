import { AuthService } from '../services/authService';
import { JWTUtils } from './jwt';
import { TokenBlacklistService } from '../services/tokenBlacklistService';

/**
 * Test the complete authentication flow including logout
 */
async function testAuthFlow(): Promise<void> {
  console.log('🧪 Testing Complete Authentication Flow...\n');

  try {
    // Test 1: Create a test user (we already have one)
    console.log('1. Testing user lookup...');
    const testUser = await AuthService.findUserByEmail('testlogout@example.com');
    console.log(`✅ User found: ${testUser ? testUser.email : 'NOT FOUND'}`);

    if (!testUser) {
      console.log('❌ Test user not found, creating one...');
      const newUser = await AuthService.registerUser({
        email: 'testlogout@example.com',
        password: 'VerySecureP@ssw0rd2026!#'
      });
      console.log(`✅ Created user: ${newUser.email}`);
    }

    // Test 2: Test authentication
    console.log('\n2. Testing authentication...');
    const authResult = await AuthService.authenticateUser(
      'testlogout@example.com',
      'VerySecureP@ssw0rd2026!#'
    );

    console.log(`✅ Authentication successful for: ${authResult.user.email}`);
    console.log(`✅ Token structure:`, {
      hasToken: !!authResult.token,
      hasTokenString: !!authResult.token?.token,
      hasExpiresAt: !!authResult.token?.expiresAt,
      hasExpiresIn: !!authResult.token?.expiresIn
    });

    if (authResult.token?.token) {
      console.log(`✅ Token preview: ${authResult.token.token.substring(0, 50)}...`);
      console.log(`✅ Expires in: ${authResult.token.expiresIn}`);
    }

    // Test 3: Test token verification
    console.log('\n3. Testing token verification...');
    if (authResult.token?.token) {
      const verification = JWTUtils.verifyToken(authResult.token.token);
      console.log(`✅ Token verification: ${verification.valid ? 'VALID' : 'INVALID'}`);

      if (verification.payload) {
        console.log(`✅ Token payload:`, {
          sub: verification.payload.sub,
          email: verification.payload.email
        });
      }
    }

    // Test 4: Test token blacklisting (logout)
    console.log('\n4. Testing token blacklisting...');
    if (authResult.token?.token) {
      // Check if token is initially not blacklisted
      const initialCheck = await TokenBlacklistService.isTokenBlacklisted(authResult.token.token);
      console.log(`✅ Initial blacklist check: ${initialCheck ? 'BLACKLISTED' : 'NOT_BLACKLISTED'}`);

      // Blacklist the token (simulate logout)
      await TokenBlacklistService.blacklistToken(authResult.token.token, authResult.user.id);
      console.log(`✅ Token blacklisted`);

      // Verify token is now blacklisted
      const afterCheck = await TokenBlacklistService.isTokenBlacklisted(authResult.token.token);
      console.log(`✅ After blacklist check: ${afterCheck ? 'BLACKLISTED' : 'NOT_BLACKLISTED'}`);
    }

    // Test 5: Check blacklist stats
    console.log('\n5. Checking blacklist statistics...');
    const stats = TokenBlacklistService.getBlacklistStats();
    console.log(`✅ Blacklist stats:`, stats);

    console.log('\n🎉 Authentication flow test completed successfully!');

  } catch (error) {
    console.error('❌ Authentication flow test failed:', error);
    throw error;
  }
}

// Export for use
export { testAuthFlow };

// Run the test if this file is executed directly
if (require.main === module) {
  testAuthFlow().catch(console.error);
}