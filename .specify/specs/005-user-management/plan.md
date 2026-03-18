# User Management - Technical Implementation Plan

**Plan ID**: 005-plan
**Spec ID**: 005
**Status**: Ready for Implementation
**Created**: 2026-03-18
**Tech Stack**: Node.js, TypeScript, Express.js, MongoDB, Handlebars

## Architecture Overview

### Implementation Strategy
This plan extends the existing authentication system with user management capabilities, following the established patterns of Controllers → Services → Models separation.

### Key Components
- **User Model Extensions**: Add role and displayName fields
- **Profile Management**: Self-service profile editing and viewing
- **Password Management**: Secure password change with token invalidation
- **Admin Interface**: User management dashboard for administrators

## Database Schema Changes

### User Model Updates
```typescript
// src/models/User.ts - Schema Extensions
interface IUser extends Document {
  // Existing fields
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;

  // New fields for user management
  displayName?: string;           // Optional display name
  role: 'user' | 'admin';         // User role (default: 'user')
  passwordChangedAt?: Date;       // Track password changes
  lastLoginAt?: Date;             // Track last login (for admin view)
}
```

### Migration Strategy
```typescript
// Database migration for existing users
db.users.updateMany(
  { role: { $exists: false } },
  { $set: { role: 'user' } }
);
```

### Indexes
```javascript
// Performance indexes
db.users.createIndex({ role: 1 });                    // Admin queries
db.users.createIndex({ isActive: 1, createdAt: -1 }); // Active user listing
db.users.createIndex({ email: 1, role: 1 });          // Admin user search
```

## API Endpoints

### User Profile Management
```typescript
// GET /profile - View user profile
// PUT /profile - Update user profile
// GET /profile/stats - User statistics (note count, etc.)
```

### Password Management
```typescript
// POST /profile/change-password
// Body: { currentPassword, newPassword, confirmPassword }
// Response: { success, message, requiresReauth: true }
```


### Admin Endpoints
```typescript
// GET /admin/users - List all users (paginated)
// PUT /admin/users/:id/status - Toggle user active status
// GET /admin/users/:id - Get user details
// GET /admin/stats - System statistics
```

## Backend Implementation

### 1. User Service Extensions
```typescript
// src/services/userService.ts
export class UserService {
  // Profile management
  static async getProfile(userId: string): Promise<UserProfileData>
  static async updateProfile(userId: string, data: ProfileUpdateData): Promise<void>
  static async getUserStats(userId: string): Promise<UserStatsData>

  // Password management
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>

  // Admin functions
  static async getAllUsers(page: number, limit: number): Promise<PaginatedUsers>
  static async toggleUserStatus(adminId: string, targetUserId: string): Promise<void>
  static async getSystemStats(): Promise<SystemStats>
}
```

### 2. Profile Controller
```typescript
// src/controllers/profileController.ts
export class ProfileController {
  // GET /profile - Render profile view
  static async getProfileView(req: Request, res: Response): Promise<void>

  // GET /profile/api - Get profile data (JSON)
  static async getProfile(req: Request, res: Response): Promise<void>

  // PUT /profile/api - Update profile data
  static async updateProfile(req: Request, res: Response): Promise<void>

  // POST /profile/change-password
  static async changePassword(req: Request, res: Response): Promise<void>
}
```

### 3. Admin Controller
```typescript
// src/controllers/adminController.ts
export class AdminController {
  // GET /admin/users - Admin user management view
  static async getUsersView(req: Request, res: Response): Promise<void>

  // GET /admin/users/api - Get users list (JSON)
  static async getUsers(req: Request, res: Response): Promise<void>

  // PUT /admin/users/:id/status - Toggle user status
  static async toggleUserStatus(req: Request, res: Response): Promise<void>

  // GET /admin/stats - System statistics
  static async getSystemStats(req: Request, res: Response): Promise<void>
}
```

### 4. Middleware Extensions
```typescript
// src/middleware/adminAuth.ts
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Verify user is authenticated AND has admin role
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// src/middleware/profileValidation.ts
export const validateProfileUpdate = [
  body('displayName').optional().isLength({ min: 2, max: 50 }).trim(),
  handleValidationErrors
];

export const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword),
  handleValidationErrors
];
```

### 5. Routes Structure
```typescript
// src/routes/profileRoutes.ts
const router = express.Router();

// Profile management (authenticated users)
router.get('/', authenticateWeb, ProfileController.getProfileView);
router.get('/api', authenticateToken, ProfileController.getProfile);
router.put('/api', authenticateToken, validateProfileUpdate, ProfileController.updateProfile);
router.post('/change-password', authenticateToken, validatePasswordChange, ProfileController.changePassword);

// src/routes/adminRoutes.ts
const router = express.Router();

// Admin-only routes
router.use(authenticateToken, requireAdmin); // Apply to all admin routes

router.get('/users', AdminController.getUsersView);
router.get('/users/api', AdminController.getUsers);
router.put('/users/:id/status', AdminController.toggleUserStatus);
router.get('/stats', AdminController.getSystemStats);
```

## Frontend Implementation

### 1. Profile Management Templates
```handlebars
<!-- views/profile/index.handlebars -->
<div class="profile-container">
  <h1>User Profile</h1>

  <div class="profile-section">
    <h2>Account Information</h2>
    <form id="profile-form">
      <div class="form-group">
        <label>Email:</label>
        <input type="email" value="{{user.email}}" disabled>
      </div>

      <div class="form-group">
        <label>Display Name:</label>
        <input type="text" name="displayName" value="{{user.displayName}}" maxlength="50">
      </div>

      <div class="form-group">
        <label>Member Since:</label>
        <span>{{formatDate user.createdAt}}</span>
      </div>

      <button type="submit" class="btn btn-primary">Update Profile</button>
    </form>
  </div>

  <div class="profile-section">
    <h2>Change Password</h2>
    <form id="password-form">
      <div class="form-group">
        <label>Current Password:</label>
        <input type="password" name="currentPassword" required>
      </div>

      <div class="form-group">
        <label>New Password:</label>
        <input type="password" name="newPassword" required>
      </div>

      <div class="form-group">
        <label>Confirm Password:</label>
        <input type="password" name="confirmPassword" required>
      </div>

      <button type="submit" class="btn btn-warning">Change Password</button>
    </form>
  </div>
</div>
```

### 2. Admin Interface Templates
```handlebars
<!-- views/admin/users.handlebars -->
<div class="admin-container">
  <h1>User Management</h1>

  <div class="admin-stats">
    <div class="stat-card">
      <h3>Total Users</h3>
      <span class="stat-number">{{stats.totalUsers}}</span>
    </div>
    <div class="stat-card">
      <h3>Active Users</h3>
      <span class="stat-number">{{stats.activeUsers}}</span>
    </div>
    <div class="stat-card">
      <h3>Total Notes</h3>
      <span class="stat-number">{{stats.totalNotes}}</span>
    </div>
  </div>

  <div class="user-table-container">
    <table class="user-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Display Name</th>
          <th>Role</th>
          <th>Status</th>
          <th>Created</th>
          <th>Notes</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="users-list">
        <!-- Populated via JavaScript -->
      </tbody>
    </table>
  </div>

  <div class="pagination">
    <!-- Pagination controls -->
  </div>
</div>
```

### 3. Client-Side JavaScript
```typescript
// public/js/profile.js
class ProfileManager {
  async updateProfile(formData: FormData): Promise<void> {
    // Handle profile updates
  }

  async changePassword(formData: FormData): Promise<void> {
    // Handle password changes with token refresh
  }
}

// public/js/admin.js
class AdminUserManager {
  async loadUsers(page: number = 1): Promise<void> {
    // Load and display user list
  }

  async toggleUserStatus(userId: string): Promise<void> {
    // Toggle user active/inactive status
  }

  async searchUsers(query: string): Promise<void> {
    // Search users by email or name
  }
}
```

## Security Considerations

### 1. Authorization Checks
- **Profile Access**: Users can only access/modify their own profile
- **Admin Functions**: Role-based access control with `requireAdmin` middleware
- **Password Changes**: Always require current password confirmation

### 2. Token Management
```typescript
// After password change, invalidate all existing tokens
await TokenBlacklistService.blacklistAllUserTokens(userId);
```

### 3. Input Validation
- **Display Name**: Sanitize and length limits
- **Password Strength**: Enforce complexity requirements
- **Rate Limiting**: Protect password change and admin actions

### 4. Logging & Monitoring
```typescript
// Security event logging
logger.security('Password changed', { userId, timestamp });
logger.security('Admin action performed', { adminId, action, targetUserId, timestamp });
```

## Testing Strategy

### 1. Unit Tests
```typescript
// tests/unit/services/userService.test.ts
describe('UserService', () => {
  describe('Profile Management', () => {
    it('should update user profile successfully');
    it('should reject invalid display name');
    it('should get user profile with stats');
  });

  describe('Password Management', () => {
    it('should change password with valid current password');
    it('should reject wrong current password');
    it('should invalidate all tokens after password change');
  });
});
```

### 2. Integration Tests
```typescript
// tests/integration/profile-api.test.ts
describe('Profile API', () => {
  it('should get user profile');
  it('should update profile with valid data');
  it('should change password successfully');
});

// tests/integration/admin-api.test.ts
describe('Admin API', () => {
  it('should list users for admin');
  it('should reject non-admin access');
  it('should toggle user status');
  it('should get system statistics');
});
```

### 3. UI Tests
```typescript
// tests/ui/profile.test.ts
describe('Profile Page', () => {
  it('should display user information');
  it('should update profile via form');
  it('should change password via form');
});
```

## Performance Considerations

### 1. Database Optimization
- **Indexes**: Role-based and status-based queries
- **Aggregation**: User statistics and counts
- **Pagination**: Efficient user listing for admins

### 2. Caching Strategy
- **User Profile Data**: Cache profile information
- **System Stats**: Cache admin statistics
- **Role Checks**: Cache admin role verification

### 3. Rate Limiting
```typescript
// Special rate limits for sensitive operations
const passwordChangeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window
  message: 'Too many password change attempts'
});

const adminActionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 admin actions per window
  message: 'Too many admin actions'
});
```

## Implementation Phases

### Phase 1: Core Profile Management
1. Update User model with new fields
2. Create ProfileController and UserService extensions
3. Implement profile view and update functionality
4. Add profile management routes
5. Create profile templates

### Phase 2: Password Management
1. Implement password change functionality
2. Add token invalidation after password change
3. Create password change UI
4. Add validation and security checks

### Phase 3: Admin Interface
1. Create admin authorization middleware
2. Implement AdminController and admin routes
3. Create admin user management templates
4. Add admin statistics and user management features

### Phase 4: Testing & Polish
1. Write comprehensive test suite
2. Add proper error handling and logging
3. Implement rate limiting and security measures
4. Performance optimization and caching

## Migration & Deployment

### Database Migration
```bash
# Run migration script to add new fields
npm run migrate:add-user-management-fields

# Seed admin user if needed
npm run seed:admin-user
```

### Environment Variables
```env
# Add to .env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password
PROFILE_UPLOAD_LIMIT=5MB
```

### Deployment Checklist
- [ ] Database migration completed
- [ ] Admin user seeded
- [ ] Rate limiting configured
- [ ] Logging enabled for security events
- [ ] Tests passing
- [ ] Documentation updated

## Risks & Mitigation

### Security Risks
- **Privilege Escalation**: Ensure robust admin checks
- **Token Management**: Proper token invalidation after sensitive operations

### Technical Risks
- **Database Performance**: Monitor queries with new indexes
- **Admin Interface**: Ensure proper pagination for large user lists
- **Backward Compatibility**: Careful migration of existing User documents

### Mitigation Strategies
- Comprehensive testing of authorization logic
- Database query monitoring and optimization
- Gradual rollout with feature flags
- Backup and rollback procedures

## Success Metrics
- **Functionality**: All user management features working as specified
- **Security**: No privilege escalation or unauthorized access
- **Performance**: Profile and admin pages load within 2 seconds
- **Reliability**: Zero downtime during deployment and migration
- **Usability**: Intuitive user interface with proper error handling