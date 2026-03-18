import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// Interface for User document
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // New fields for user management
  displayName?: string;
  role: 'user' | 'admin';
  passwordChangedAt?: Date;
  deactivatedAt?: Date;
  lastLoginAt?: Date;

  // Instance methods
  verifyPassword(password: string): Promise<boolean>;
}

// Interface for User model static methods
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

// User schema definition
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email: string) {
        // Basic email validation regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
    select: false // Don't include in queries by default for security
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // New fields for user management
  displayName: {
    type: String,
    maxlength: [50, 'Display name cannot exceed 50 characters'],
    trim: true,
    default: null
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'admin'],
      message: 'Role must be either user or admin'
    },
    default: 'user',
    index: true
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },
  deactivatedAt: {
    type: Date,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'users'
});

// Create compound indexes for performance
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1 }); // For admin queries
userSchema.index({ isActive: 1, createdAt: -1 }); // For active user listings
userSchema.index({ email: 1, role: 1 }); // For admin user search

// Instance method: Verify password against stored hash
userSchema.methods.verifyPassword = async function(password: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, this.passwordHash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

// Static method: Find user by email
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({
    email: email.toLowerCase().trim(),
    isActive: true
  }).select('+passwordHash'); // Include passwordHash for authentication
};

// Export the User model
export const User = mongoose.model<IUser, IUserModel>('User', userSchema);