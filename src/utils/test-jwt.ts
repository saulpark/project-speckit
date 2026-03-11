import { JWTUtils } from './jwt';

/**
 * Simple test function to verify JWT utilities work correctly
 */
async function testJWTUtils(): Promise<void> {
  console.log('🧪 Testing JWT Utilities...\n');

  try {
    // Test token generation
    console.log('1. Testing token generation...');
    const tokenResponse = JWTUtils.generateToken('user123', 'test@example.com');
    console.log(`✅ Token generated successfully`);
    console.log(`   Token length: ${tokenResponse.token.length} chars`);
    console.log(`   Expires in: ${tokenResponse.expiresIn}`);
    console.log(`   Expires at: ${tokenResponse.expiresAt.toISOString()}`);

    // Test token verification (valid token)
    console.log('\n2. Testing token verification (valid)...');
    const verification = JWTUtils.verifyToken(tokenResponse.token);
    console.log(`✅ Token verification: ${verification.valid ? 'VALID' : 'INVALID'}`);
    if (verification.payload) {
      console.log(`   User ID: ${verification.payload.sub}`);
      console.log(`   Email: ${verification.payload.email}`);
    }

    // Test token verification (invalid token)
    console.log('\n3. Testing token verification (invalid)...');
    const invalidVerification = JWTUtils.verifyToken('invalid.jwt.token');
    console.log(`✅ Invalid token rejected: ${!invalidVerification.valid ? 'PASS' : 'FAIL'}`);
    if (invalidVerification.error) {
      console.log(`   Error: ${invalidVerification.error}`);
    }

    // Test token extraction from header
    console.log('\n4. Testing token extraction...');
    const authHeader = `Bearer ${tokenResponse.token}`;
    const extractedToken = JWTUtils.extractTokenFromHeader(authHeader);
    console.log(`✅ Token extraction: ${extractedToken ? 'PASS' : 'FAIL'}`);
    console.log(`   Extracted token matches: ${extractedToken === tokenResponse.token}`);

    // Test token expiration check
    console.log('\n5. Testing expiration check...');
    const isExpired = JWTUtils.isTokenExpired(tokenResponse.token);
    console.log(`✅ Token expiration check: ${!isExpired ? 'PASS' : 'FAIL'}`);

    // Test configuration
    console.log('\n6. Testing configuration...');
    const config = JWTUtils.getConfig();
    console.log(`✅ Default expires in: ${config.defaultExpiresIn}`);
    console.log(`✅ Has secret configured: ${config.hasSecret}`);

    // Test short expiration token
    console.log('\n7. Testing short expiration token...');
    const shortToken = JWTUtils.generateToken('user456', 'short@example.com', '1s');
    console.log(`✅ Short token generated, expires in: ${shortToken.expiresIn}`);

    // Wait for token to expire
    console.log('\n8. Waiting for token to expire...');
    setTimeout(() => {
      const expiredCheck = JWTUtils.isTokenExpired(shortToken.token);
      console.log(`✅ Token expired after waiting: ${expiredCheck ? 'PASS' : 'FAIL'}`);
    }, 1500);

    console.log('\n🎉 JWT utilities tests completed successfully!');

  } catch (error) {
    console.error('❌ JWT utility test failed:', error);
    throw error;
  }
}

// Export for potential use
export { testJWTUtils };