import { JWTUtils } from '../src/utils/jwt';
import { PasswordUtils } from '../src/utils/crypto';

describe('Authentication System', () => {
  describe('JWT Utils', () => {
    it('should generate and verify tokens', () => {
      const token = JWTUtils.generateToken('test-user', 'test@example.com');
      expect(token).toHaveProperty('token');
      expect(token).toHaveProperty('expiresAt');

      const verification = JWTUtils.verifyToken(token.token);
      expect(verification.valid).toBe(true);
      expect(verification.payload?.sub).toBe('test-user');
    });

    it('should reject invalid tokens', () => {
      const verification = JWTUtils.verifyToken('invalid-token');
      expect(verification.valid).toBe(false);
    });
  });

  describe('Password Utils', () => {
    it('should hash and verify passwords', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordUtils.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const isValid = await PasswordUtils.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should validate password strength', () => {
      const validation = PasswordUtils.validatePasswordStrength('TestPassword123!');
      expect(validation.isValid).toBe(true);

      const weakValidation = PasswordUtils.validatePasswordStrength('123');
      expect(weakValidation.isValid).toBe(false);
    });
  });
});
