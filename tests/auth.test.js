"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../src/utils/jwt");
const crypto_1 = require("../src/utils/crypto");
describe('Authentication System', () => {
    describe('JWT Utils', () => {
        it('should generate and verify tokens', () => {
            const token = jwt_1.JWTUtils.generateToken('test-user', 'test@example.com');
            expect(token).toHaveProperty('token');
            expect(token).toHaveProperty('expiresAt');
            const verification = jwt_1.JWTUtils.verifyToken(token.token);
            expect(verification.valid).toBe(true);
            expect(verification.payload?.sub).toBe('test-user');
        });
        it('should reject invalid tokens', () => {
            const verification = jwt_1.JWTUtils.verifyToken('invalid-token');
            expect(verification.valid).toBe(false);
        });
    });
    describe('Password Utils', () => {
        it('should hash and verify passwords', async () => {
            const password = 'TestPassword123!';
            const hash = await crypto_1.PasswordUtils.hashPassword(password);
            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            const isValid = await crypto_1.PasswordUtils.verifyPassword(password, hash);
            expect(isValid).toBe(true);
        });
        it('should validate password strength', () => {
            const validation = crypto_1.PasswordUtils.validatePasswordStrength('TestPassword123!');
            expect(validation.isValid).toBe(true);
            const weakValidation = crypto_1.PasswordUtils.validatePasswordStrength('123');
            expect(weakValidation.isValid).toBe(false);
        });
    });
});
//# sourceMappingURL=auth.test.js.map