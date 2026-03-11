import mongoose from 'mongoose';
import { User, IUser } from '../../../src/models/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';

describe('User Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    it('should create a new user with valid data', async () => {
      const password = 'TestPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const userData = {
        email: 'test@example.com',
        passwordHash
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser).toBeDefined();
      expect(savedUser.email).toBe(userData.email.toLowerCase());
      expect(savedUser.passwordHash).toBe(userData.passwordHash);
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should normalize email to lowercase', async () => {
      const password = 'TestPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const userData = {
        email: 'Test.Email@EXAMPLE.COM',
        passwordHash
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test.email@example.com');
    });

    it('should generate unique _id', async () => {
      const password = 'TestPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const userData1 = {
        email: 'test1@example.com',
        passwordHash
      };

      const userData2 = {
        email: 'test2@example.com',
        passwordHash
      };

      const user1 = new User(userData1);
      const user2 = new User(userData2);

      const savedUser1 = await user1.save();
      const savedUser2 = await user2.save();

      expect(savedUser1._id).not.toEqual(savedUser2._id);
    });
  });

  describe('User Validation', () => {
    it('should require email', async () => {
      const passwordHash = await bcrypt.hash('TestPassword123!', 12);

      const userData = {
        passwordHash
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow(/email/i);
    });

    it('should require passwordHash', async () => {
      const userData = {
        email: 'test@example.com'
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow(/passwordHash/i);
    });

    it('should validate email format', async () => {
      const passwordHash = await bcrypt.hash('TestPassword123!', 12);

      const userData = {
        email: 'invalid-email-format',
        passwordHash
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow(/email/i);
    });

    it('should enforce unique email constraint', async () => {
      const password = 'TestPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const userData = {
        email: 'test@example.com',
        passwordHash
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow(/duplicate/i);
    });
  });

  describe('User Instance Methods', () => {
    let user: IUser;

    beforeEach(async () => {
      const password = 'TestPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const userData = {
        email: 'test@example.com',
        passwordHash
      };

      user = new User(userData);
      await user.save();
    });

    it('should verify correct password', async () => {
      const isValid = await user.verifyPassword('TestPassword123!');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await user.verifyPassword('WrongPassword');
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const isValid = await user.verifyPassword('');
      expect(isValid).toBe(false);
    });

    it('should handle null password gracefully', async () => {
      const isValid = await user.verifyPassword(null as any);
      expect(isValid).toBe(false);
    });

    it('should handle undefined password gracefully', async () => {
      const isValid = await user.verifyPassword(undefined as any);
      expect(isValid).toBe(false);
    });
  });

  describe('User Static Methods', () => {
    beforeEach(async () => {
      const password = 'TestPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const userData = {
        email: 'test@example.com',
        passwordHash
      };

      const user = new User(userData);
      await user.save();
    });

    it('should find user by email', async () => {
      const foundUser = await User.findByEmail('test@example.com');

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('test@example.com');
      expect(foundUser?.passwordHash).toBeDefined(); // Should include passwordHash
    });

    it('should find user by email case-insensitive', async () => {
      const foundUser = await User.findByEmail('TEST@EXAMPLE.COM');

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await User.findByEmail('nonexistent@example.com');

      expect(foundUser).toBeNull();
    });

    it('should only find active users', async () => {
      // Deactivate the user
      await User.updateOne({ email: 'test@example.com' }, { isActive: false });

      const foundUser = await User.findByEmail('test@example.com');

      expect(foundUser).toBeNull();
    });
  });

  describe('User Schema Features', () => {
    it('should have proper timestamps', async () => {
      const password = 'TestPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const userData = {
        email: 'test@example.com',
        passwordHash
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
      expect(savedUser.createdAt).toEqual(savedUser.updatedAt);

      // Update the user to test updatedAt change
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      savedUser.isActive = false;
      await savedUser.save();

      expect(savedUser.updatedAt).not.toEqual(savedUser.createdAt);
    });

    it('should have default isActive value', async () => {
      const password = 'TestPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const userData = {
        email: 'test@example.com',
        passwordHash
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.isActive).toBe(true);
    });

    it('should handle trim and lowercase for email', async () => {
      const password = 'TestPassword123!';
      const passwordHash = await bcrypt.hash(password, 12);

      const userData = {
        email: '  Test.Email@EXAMPLE.COM  ',
        passwordHash
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test.email@example.com');
    });
  });
});