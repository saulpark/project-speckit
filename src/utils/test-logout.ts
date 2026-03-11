import { JWTUtils } from './jwt';
import { TokenBlacklistService } from '../services/tokenBlacklistService';

/**
 * Test function to verify token blacklisting and logout functionality
 */
async function testTokenBlacklist(): Promise<void> {
  console.log('🧪 Testing Token Blacklist and Logout Functionality...\n');

  try {
    // Test 1: Generate a test token
    console.log('1. Generating test token...');
    const tokenResponse = JWTUtils.generateToken('test-user-123', 'test@example.com');
    console.log(`✅ Token generated: ${tokenResponse.token.substring(0, 50)}...`);

    // Test 2: Verify token is valid initially
    console.log('\n2. Verifying token is initially valid...');
    const initialVerification = JWTUtils.verifyToken(tokenResponse.token);
    console.log(`✅ Token verification: ${initialVerification.valid ? 'VALID' : 'INVALID'}`);

    // Test 3: Check if token is NOT blacklisted initially
    console.log('\n3. Checking if token is initially blacklisted...');
    const initialBlacklistCheck = await TokenBlacklistService.isTokenBlacklisted(tokenResponse.token);
    console.log(`✅ Token blacklist status: ${initialBlacklistCheck ? 'BLACKLISTED' : 'NOT_BLACKLISTED'}`);

    // Test 4: Blacklist the token (simulate logout)
    console.log('\n4. Blacklisting token (simulating logout)...');
    await TokenBlacklistService.blacklistToken(tokenResponse.token, 'test-user-123');
    console.log(`✅ Token blacklisted successfully`);

    // Test 5: Check if token is now blacklisted
    console.log('\n5. Verifying token is now blacklisted...');
    const afterBlacklistCheck = await TokenBlacklistService.isTokenBlacklisted(tokenResponse.token);
    console.log(`✅ Token blacklist status: ${afterBlacklistCheck ? 'BLACKLISTED' : 'NOT_BLACKLISTED'}`);

    // Test 6: Generate multiple tokens for the same user
    console.log('\n6. Testing multiple tokens for same user...');
    const token2 = JWTUtils.generateToken('test-user-123', 'test@example.com');
    const token3 = JWTUtils.generateToken('test-user-123', 'test@example.com');
    console.log(`✅ Generated 2 additional tokens`);

    // Test 7: Blacklist one of the new tokens
    console.log('\n7. Blacklisting one additional token...');
    await TokenBlacklistService.blacklistToken(token2.token, 'test-user-123');

    // Test 8: Check blacklist statistics
    console.log('\n8. Checking blacklist statistics...');
    const stats = TokenBlacklistService.getBlacklistStats();
    console.log(`✅ Blacklist stats:`, stats);

    // Test 9: Test with expired token (short expiry)
    console.log('\n9. Testing with short-expiry token...');
    const shortToken = JWTUtils.generateToken('test-user-456', 'short@example.com', '1s');
    console.log(`✅ Generated short-expiry token`);

    // Wait for token to expire
    console.log('\n10. Waiting for token to expire...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const expiredCheck = JWTUtils.isTokenExpired(shortToken.token);
    console.log(`✅ Token expired: ${expiredCheck}`);

    // Try to blacklist expired token
    console.log('\n11. Trying to blacklist expired token...');
    await TokenBlacklistService.blacklistToken(shortToken.token, 'test-user-456');
    const expiredBlacklistCheck = await TokenBlacklistService.isTokenBlacklisted(shortToken.token);
    console.log(`✅ Expired token blacklist status: ${expiredBlacklistCheck ? 'BLACKLISTED' : 'NOT_BLACKLISTED'}`);

    // Test 12: Final statistics
    console.log('\n12. Final blacklist statistics...');
    const finalStats = TokenBlacklistService.getBlacklistStats();
    console.log(`✅ Final stats:`, finalStats);

    console.log('\n🎉 Token blacklist tests completed successfully!');

    // Test 13: Clean up (optional)
    console.log('\n13. Cleaning up blacklist...');
    TokenBlacklistService.clearBlacklist();
    const cleanStats = TokenBlacklistService.getBlacklistStats();
    console.log(`✅ Cleanup stats:`, cleanStats);

  } catch (error) {
    console.error('❌ Token blacklist test failed:', error);
    throw error;
  }
}

// Export for potential use
export { testTokenBlacklist };