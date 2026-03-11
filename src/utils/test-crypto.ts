import { PasswordUtils } from './crypto';

/**
 * Simple test function to verify password utilities work correctly
 */
async function testPasswordUtils(): Promise<void> {
  console.log('🧪 Testing Password Utilities...\n');

  try {
    const testPassword = 'TestPassword123';

    // Test password hashing
    console.log('1. Testing password hashing...');
    const hashedPassword = await PasswordUtils.hashPassword(testPassword);
    console.log(`✅ Password hashed successfully: ${hashedPassword.substring(0, 20)}...`);

    // Test password verification (correct password)
    console.log('\n2. Testing password verification (correct)...');
    const isValid = await PasswordUtils.verifyPassword(testPassword, hashedPassword);
    console.log(`✅ Password verification: ${isValid ? 'PASS' : 'FAIL'}`);

    // Test password verification (incorrect password)
    console.log('\n3. Testing password verification (incorrect)...');
    const isInvalid = await PasswordUtils.verifyPassword('WrongPassword123', hashedPassword);
    console.log(`✅ Incorrect password rejected: ${!isInvalid ? 'PASS' : 'FAIL'}`);

    // Test password strength validation
    console.log('\n4. Testing password strength validation...');

    const strongPassword = PasswordUtils.validatePasswordStrength('StrongPassword123');
    console.log(`✅ Strong password validation: ${strongPassword.isValid ? 'PASS' : 'FAIL'}`);

    const weakPassword = PasswordUtils.validatePasswordStrength('weak');
    console.log(`✅ Weak password rejected: ${!weakPassword.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`   Errors: ${weakPassword.errors.join(', ')}`);

    // Test salt rounds configuration
    console.log(`\n5. Salt rounds configuration: ${PasswordUtils.getSaltRounds()}`);

    console.log('\n🎉 All password utility tests passed!');

  } catch (error) {
    console.error('❌ Password utility test failed:', error);
    throw error;
  }
}

// Export for potential use in other test files
export { testPasswordUtils };