import { JWTUtils, JWTPayload, TokenResponse, VerificationResult } from '../../../src/utils/jwt';
import jwt from 'jsonwebtoken';

describe('JWTUtils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Token Generation', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'user123';
      const email = 'test@example.com';

      const tokenResponse: TokenResponse = JWTUtils.generateToken(userId, email);

      expect(tokenResponse).toHaveProperty('token');
      expect(tokenResponse).toHaveProperty('expiresIn');
      expect(tokenResponse).toHaveProperty('expiresAt');
      expect(tokenResponse.token).toBeTruthy();
      expect(tokenResponse.expiresIn).toBe('1h');
      expect(tokenResponse.expiresAt).toBeInstanceOf(Date);
    });

    it('should create token with correct payload', () => {
      const userId = 'user123';
      const email = 'Test@Example.COM';

      const tokenResponse: TokenResponse = JWTUtils.generateToken(userId, email);
      const decoded = jwt.decode(tokenResponse.token) as JWTPayload;

      expect(decoded.sub).toBe(userId);
      expect(decoded.email).toBe('test@example.com'); // Should be lowercase
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should use custom expiration time', () => {
      const userId = 'user123';
      const email = 'test@example.com';
      const customExpiry = '2h';

      const tokenResponse: TokenResponse = JWTUtils.generateToken(userId, email, customExpiry);

      expect(tokenResponse.expiresIn).toBe(customExpiry);
    });

    it('should include issuer and audience in token', () => {
      const userId = 'user123';
      const email = 'test@example.com';

      const tokenResponse: TokenResponse = JWTUtils.generateToken(userId, email);
      const decoded = jwt.verify(tokenResponse.token, process.env.JWT_SECRET!, {
        issuer: 'project-speckit-auth',
        audience: 'project-speckit-users'
      }) as any;

      expect(decoded.iss).toBe('project-speckit-auth');
      expect(decoded.aud).toBe('project-speckit-users');
    });

    it('should throw error for missing userId', () => {
      expect(() => {
        JWTUtils.generateToken('', 'test@example.com');
      }).toThrow('User ID and email are required for token generation');
    });

    it('should throw error for missing email', () => {
      expect(() => {
        JWTUtils.generateToken('user123', '');
      }).toThrow('User ID and email are required for token generation');
    });

    it('should handle token generation with fallback secret', () => {
      delete process.env.JWT_SECRET;

      const userId = 'user123';
      const email = 'test@example.com';

      expect(() => {
        JWTUtils.generateToken(userId, email);
      }).not.toThrow();
    });
  });

  describe('Token Verification', () => {
    let validToken: string;

    beforeEach(() => {
      const tokenResponse = JWTUtils.generateToken('user123', 'test@example.com');
      validToken = tokenResponse.token;
    });

    it('should verify valid token', () => {
      const result: VerificationResult = JWTUtils.verifyToken(validToken);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload!.sub).toBe('user123');
      expect(result.payload!.email).toBe('test@example.com');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const result: VerificationResult = JWTUtils.verifyToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should reject empty token', () => {
      const result: VerificationResult = JWTUtils.verifyToken('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is required and must be a string');
    });

    it('should reject non-string token', () => {
      const result: VerificationResult = JWTUtils.verifyToken(null as any);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is required and must be a string');
    });

    it('should reject token with invalid signature', () => {
      const tokenWithWrongSecret = jwt.sign(
        { sub: 'user123', email: 'test@example.com' },
        'wrong-secret'
      );

      const result: VerificationResult = JWTUtils.verifyToken(tokenWithWrongSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user123',
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        },
        process.env.JWT_SECRET!,
        {
          issuer: 'project-speckit-auth',
          audience: 'project-speckit-users'
        }
      );

      const result: VerificationResult = JWTUtils.verifyToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has expired');
    });

    it('should reject malformed token', () => {
      const malformedToken = 'malformed.token';
      const result: VerificationResult = JWTUtils.verifyToken(malformedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Malformed token');
    });

    it('should reject token with missing required fields', () => {
      const tokenWithoutRequiredFields = jwt.sign(
        { randomField: 'value' },
        process.env.JWT_SECRET!,
        {
          issuer: 'project-speckit-auth',
          audience: 'project-speckit-users'
        }
      );

      const result: VerificationResult = JWTUtils.verifyToken(tokenWithoutRequiredFields);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token payload is missing required fields');
    });
  });

  describe('Token Header Extraction', () => {
    it('should extract token from Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const authHeader = `Bearer ${token}`;

      const extractedToken = JWTUtils.extractTokenFromHeader(authHeader);

      expect(extractedToken).toBe(token);
    });

    it('should extract token from bearer header (case insensitive)', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const authHeader = `bearer ${token}`;

      const extractedToken = JWTUtils.extractTokenFromHeader(authHeader);

      expect(extractedToken).toBe(token);
    });

    it('should extract token without Bearer prefix as fallback', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

      const extractedToken = JWTUtils.extractTokenFromHeader(token);

      expect(extractedToken).toBe(token);
    });

    it('should return null for undefined header', () => {
      const extractedToken = JWTUtils.extractTokenFromHeader(undefined);

      expect(extractedToken).toBeNull();
    });

    it('should return null for empty header', () => {
      const extractedToken = JWTUtils.extractTokenFromHeader('');

      expect(extractedToken).toBeNull();
    });

    it('should return null for malformed header', () => {
      const extractedToken = JWTUtils.extractTokenFromHeader('Invalid token format');

      expect(extractedToken).toBeNull();
    });

    it('should handle Bearer without token as null (security fix)', () => {
      const extractedToken = JWTUtils.extractTokenFromHeader('Bearer');

      expect(extractedToken).toBe(null); // Correctly reject malformed Bearer headers
    });
  });

  describe('Token Expiration Utilities', () => {
    it('should correctly identify expired token', () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user123',
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        },
        process.env.JWT_SECRET!
      );

      const isExpired = JWTUtils.isTokenExpired(expiredToken);

      expect(isExpired).toBe(true);
    });

    it('should correctly identify non-expired token', () => {
      const validToken = JWTUtils.generateToken('user123', 'test@example.com');

      const isExpired = JWTUtils.isTokenExpired(validToken.token);

      expect(isExpired).toBe(false);
    });

    it('should treat malformed token as expired', () => {
      const isExpired = JWTUtils.isTokenExpired('malformed.token');

      expect(isExpired).toBe(true);
    });

    it('should get token expiration date', () => {
      const validToken = JWTUtils.generateToken('user123', 'test@example.com');

      const expirationDate = JWTUtils.getTokenExpiration(validToken.token);

      expect(expirationDate).toBeInstanceOf(Date);
      expect(expirationDate!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for malformed token expiration', () => {
      const expirationDate = JWTUtils.getTokenExpiration('malformed.token');

      expect(expirationDate).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh valid token', () => {
      const originalToken = JWTUtils.generateToken('user123', 'test@example.com');

      const refreshedToken = JWTUtils.refreshToken(originalToken.token, '2h');

      expect(refreshedToken).toBeDefined();
      expect(refreshedToken!.token).not.toBe(originalToken.token);
      expect(refreshedToken!.expiresIn).toBe('2h');
    });

    it('should use default expiration for refresh', () => {
      const originalToken = JWTUtils.generateToken('user123', 'test@example.com');

      const refreshedToken = JWTUtils.refreshToken(originalToken.token);

      expect(refreshedToken).toBeDefined();
      expect(refreshedToken!.expiresIn).toBe('1h');
    });

    it('should return null for invalid token refresh', () => {
      const refreshedToken = JWTUtils.refreshToken('invalid.token.here');

      expect(refreshedToken).toBeNull();
    });

    it('should maintain same user data in refreshed token', async () => {
      const originalToken = JWTUtils.generateToken('user123', 'test@example.com', '1h');

      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const refreshedToken = JWTUtils.refreshToken(originalToken.token, '2h');

      const originalDecoded = jwt.decode(originalToken.token) as JWTPayload;
      const refreshedDecoded = jwt.decode(refreshedToken!.token) as JWTPayload;

      expect(refreshedDecoded.sub).toBe(originalDecoded.sub);
      expect(refreshedDecoded.email).toBe(originalDecoded.email);
      expect(refreshedDecoded.exp).toBeGreaterThan(originalDecoded.exp!);
    });
  });

  describe('Configuration', () => {
    it('should return configuration without exposing secret', () => {
      const config = JWTUtils.getConfig();

      expect(config).toHaveProperty('defaultExpiresIn');
      expect(config).toHaveProperty('hasSecret');
      expect(config.defaultExpiresIn).toBe('1h');
      expect(config.hasSecret).toBe(true);
      expect(config).not.toHaveProperty('secret');
    });

    it('should indicate missing secret', () => {
      delete process.env.JWT_SECRET;

      const config = JWTUtils.getConfig();

      expect(config.hasSecret).toBe(false);
    });
  });

  describe('Secure Secret Generation', () => {
    it('should generate secure secret of default length', () => {
      const secret = JWTUtils.generateSecureSecret();

      expect(secret).toHaveLength(128); // 64 bytes = 128 hex characters
      expect(secret).toMatch(/^[a-f0-9]+$/i);
    });

    it('should generate secure secret of custom length', () => {
      const secret = JWTUtils.generateSecureSecret(32);

      expect(secret).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(secret).toMatch(/^[a-f0-9]+$/i);
    });

    it('should generate different secrets each time', () => {
      const secret1 = JWTUtils.generateSecureSecret();
      const secret2 = JWTUtils.generateSecureSecret();

      expect(secret1).not.toBe(secret2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long user IDs and emails', () => {
      const longUserId = 'a'.repeat(1000);
      const longEmail = 'a'.repeat(240) + '@example.com'; // Near email limit

      expect(() => {
        JWTUtils.generateToken(longUserId, longEmail);
      }).not.toThrow();
    });

    it('should handle special characters in user data', () => {
      const userId = 'user-123_test.user';
      const email = 'test+special@example-domain.co.uk';

      const tokenResponse = JWTUtils.generateToken(userId, email);
      const verification = JWTUtils.verifyToken(tokenResponse.token);

      expect(verification.valid).toBe(true);
      expect(verification.payload!.sub).toBe(userId);
      expect(verification.payload!.email).toBe(email.toLowerCase());
    });

    it('should handle token verification with different secrets', () => {
      // Generate token with current secret
      const originalSecret = process.env.JWT_SECRET;
      const token = JWTUtils.generateToken('user123', 'test@example.com');

      // Create a token manually with a different secret to simulate mismatch
      const differentToken = jwt.sign(
        {
          sub: 'user123',
          email: 'test@example.com'
        },
        'different-secret',
        {
          issuer: 'project-speckit-auth',
          audience: 'project-speckit-users'
        }
      );

      const result = JWTUtils.verifyToken(differentToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
    });
  });
});