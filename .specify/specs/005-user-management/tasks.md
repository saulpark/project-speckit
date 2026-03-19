# User Management - Implementation Tasks

**Tasks ID**: 005-tasks
**Plan ID**: 005-plan
**Status**: Ready for Execution
**Created**: 2026-03-18
**Estimated Timeline**: 3-4 weeks

## Task Organization

Tasks are organized into 4 implementation phases following the technical plan. Each task includes acceptance criteria, dependencies, and implementation guidance.

### 📊 Progress Tracking
- **Total Tasks**: 32
- **Phase 1**: 8 tasks (Core Profile Management)
- **Phase 2**: 6 tasks (Password Management)
- **Phase 3**: 8 tasks (Admin Interface)
- **Phase 4**: 10 tasks (Testing & Polish)

---

# PHASE 1: Core Profile Management

## Task 1.1: Update User Model Schema
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 4 hours

### Description
Extend the existing User model to support profile management fields including displayName, role, and tracking fields.

### Files to Modify
- `src/models/User.ts`
- `src/types/User.ts` (if exists)

### Implementation Details
```typescript
// Add new interface fields to IUser
interface IUser extends Document {
  // Existing fields remain unchanged
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;

  // New fields for user management
  displayName?: string;
  role: 'user' | 'admin';
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
}

// Update schema definition
const userSchema = new mongoose.Schema({
  // ... existing fields
  displayName: {
    type: String,
    maxlength: 50,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    index: true
  },
  passwordChangedAt: Date,
  lastLoginAt: Date
});
```

### Acceptance Criteria
- [ ] User model includes all new fields with proper types
- [ ] Schema validation enforces constraints (role enum, displayName length)
- [ ] Indexes are added for performance (role field)
- [ ] TypeScript interfaces updated
- [ ] No breaking changes to existing functionality

### Dependencies
None - foundational task

---

## Task 1.2: Create Database Migration Script
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 3 hours

### Description
Create migration script to update existing user documents with default values for new fields.

### Files to Create
- `scripts/migrations/add-user-management-fields.js`
- `scripts/migrations/seed-admin-user.js`

### Implementation Details
```javascript
// Migration script to add new fields
db.users.updateMany(
  { role: { $exists: false } },
  {
    $set: {
      role: 'user',
      displayName: null,
      passwordChangedAt: null,
      lastLoginAt: null
    }
  }
);

// Create initial admin user if specified
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  // Create admin user logic
}
```

### Acceptance Criteria
- [ ] Migration script updates all existing users with default role 'user'
- [ ] Script is idempotent (can be run multiple times safely)
- [ ] Admin user seeding capability included
- [ ] Migration logging for audit purposes
- [ ] Rollback capability documented

### Dependencies
- Task 1.1 (User Model Schema)

---

## Task 1.3: Create User Service Extensions
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 5 hours

### Description
Extend UserService with profile management capabilities including profile retrieval, updates, and user statistics.

### Files to Modify/Create
- `src/services/userService.ts` (extend existing or create new)

### Implementation Details
```typescript
export class UserService {
  // Profile management methods
  static async getProfile(userId: string): Promise<UserProfileData> {
    // Retrieve user profile with note count
  }

  static async updateProfile(userId: string, data: ProfileUpdateData): Promise<void> {
    // Update display name and other profile fields
  }

  static async getUserStats(userId: string): Promise<UserStatsData> {
    // Get user statistics (note count, join date, etc.)
  }

  // Admin helper methods
  static async getUsersByRole(role: 'user' | 'admin'): Promise<IUser[]> {
    // Get users by role for admin interface
  }
}
```

### Acceptance Criteria
- [ ] Profile retrieval includes user data and statistics
- [ ] Profile updates validate input data
- [ ] User statistics calculation is accurate
- [ ] Proper error handling for all operations
- [ ] Methods are properly typed with TypeScript
- [ ] Unit tests can be written (prepare for testing phase)

### Dependencies
- Task 1.1 (User Model Schema)

---

## Task 1.4: Create Profile Controller
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 6 hours

### Description
Create ProfileController to handle profile-related HTTP requests, both for web views and API endpoints.

### Files to Create
- `src/controllers/profileController.ts`

### Implementation Details
```typescript
export class ProfileController {
  // Render profile page
  static async getProfileView(req: Request, res: Response): Promise<void> {
    // Render profile template with user data
  }

  // API endpoint for profile data
  static async getProfile(req: Request, res: Response): Promise<void> {
    // Return JSON profile data
  }

  // Update profile via API
  static async updateProfile(req: Request, res: Response): Promise<void> {
    // Handle profile updates with validation
  }

  // Get user statistics
  static async getStats(req: Request, res: Response): Promise<void> {
    // Return user statistics (note count, etc.)
  }
}
```

### Acceptance Criteria
- [ ] Controller handles both web and API routes
- [ ] Proper error handling and response formatting
- [ ] Input validation using middleware
- [ ] Authentication required for all endpoints
- [ ] Consistent API response format
- [ ] Proper HTTP status codes

### Dependencies
- Task 1.3 (User Service Extensions)

---

## Task 1.5: Create Profile Validation Middleware
**Priority**: Medium | **Complexity**: Low | **Estimated Time**: 3 hours

### Description
Create validation middleware for profile update operations using express-validator.

### Files to Create
- `src/middleware/profileValidation.ts`

### Implementation Details
```typescript
export const validateProfileUpdate = [
  body('displayName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .trim()
    .withMessage('Display name must be 2-50 characters'),

  handleValidationErrors
];

export const validateProfileView = [
  // Validation for profile view parameters
];
```

### Acceptance Criteria
- [ ] Display name validation (length, content)
- [ ] Proper sanitization of input data
- [ ] Clear error messages for validation failures
- [ ] Consistent with existing validation patterns
- [ ] Integration with existing error handling

### Dependencies
- Task 1.4 (Profile Controller)

---

## Task 1.6: Create Profile Routes
**Priority**: High | **Complexity**: Low | **Estimated Time**: 3 hours

### Description
Set up Express routes for profile management, including web views and API endpoints.

### Files to Create
- `src/routes/profileRoutes.ts`

### Files to Modify
- `src/server.ts` (register new routes)

### Implementation Details
```typescript
const router = express.Router();

// Web views
router.get('/', authenticateWeb, ProfileController.getProfileView);

// API endpoints
router.get('/api', authenticateToken, ProfileController.getProfile);
router.put('/api', authenticateToken, validateProfileUpdate, ProfileController.updateProfile);
router.get('/api/stats', authenticateToken, ProfileController.getStats);

export default router;
```

### Acceptance Criteria
- [ ] All profile routes properly defined
- [ ] Correct middleware chain (auth, validation)
- [ ] Routes registered in main server file
- [ ] RESTful API design principles followed
- [ ] Web and API routes separated appropriately

### Dependencies
- Task 1.4 (Profile Controller)
- Task 1.5 (Profile Validation)

---

## Task 1.7: Create Profile Templates
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 6 hours

### Description
Create Handlebars templates for the profile management interface including profile view and edit forms.

### Files to Create
- `views/profile/index.handlebars`
- `views/profile/partials/profile-form.handlebars`
- `public/css/profile.css`
- `public/js/profile.js`

### Implementation Details
```handlebars
<!-- Profile main template -->
<div class="profile-container">
  <h1>User Profile</h1>

  <div class="profile-section">
    <h2>Account Information</h2>
    {{> profile/partials/profile-form}}
  </div>

  <div class="profile-stats">
    <h2>Statistics</h2>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Notes Created</span>
        <span class="stat-value">{{stats.noteCount}}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Member Since</span>
        <span class="stat-value">{{formatDate user.createdAt}}</span>
      </div>
    </div>
  </div>
</div>
```

### Acceptance Criteria
- [ ] Profile information displays correctly
- [ ] Edit form with proper validation
- [ ] Responsive design for mobile/desktop
- [ ] AJAX form submission with error handling
- [ ] User-friendly error messages
- [ ] Consistent styling with existing pages

### Dependencies
- Task 1.6 (Profile Routes)

---

## Task 1.8: Add Profile Navigation Links
**Priority**: Low | **Complexity**: Low | **Estimated Time**: 2 hours

### Description
Update navigation templates to include profile management links for authenticated users.

### Files to Modify
- `views/layouts/main.handlebars`
- `views/partials/navbar.handlebars` (if exists)

### Implementation Details
```handlebars
<!-- Add to navigation -->
{{#if user}}
  <li><a href="/profile">Profile</a></li>
  <li><a href="/auth/logout">Logout</a></li>
{{else}}
  <li><a href="/auth/login">Login</a></li>
{{/if}}
```

### Acceptance Criteria
- [ ] Profile link appears for authenticated users
- [ ] Navigation updates on login/logout
- [ ] Consistent styling with existing navigation
- [ ] Mobile-responsive navigation
- [ ] Profile link highlights on profile pages

### Dependencies
- Task 1.7 (Profile Templates)

---

# PHASE 2: Password Management

## Task 2.1: Implement Password Change Service
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 5 hours

### Description
Add password change functionality to UserService with current password verification and security measures.

### Files to Modify
- `src/services/userService.ts`
- `src/services/authService.ts` (if password verification is there)

### Implementation Details
```typescript
export class UserService {
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // 1. Verify current password
    // 2. Hash new password
    // 3. Update user document
    // 4. Set passwordChangedAt timestamp
    // 5. Invalidate all existing tokens
  }

  static async verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
    // Verify user's current password
  }
}
```

### Acceptance Criteria
- [ ] Current password verification required
- [ ] New password properly hashed with bcrypt
- [ ] passwordChangedAt timestamp updated
- [ ] All existing tokens invalidated after change
- [ ] Proper error handling for invalid passwords
- [ ] Password strength validation

### Dependencies
- Task 1.3 (User Service Extensions)

---

## Task 2.2: Create Password Validation Middleware
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 4 hours

### Description
Create robust password validation middleware with strength requirements and confirmation matching.

### Files to Create
- `src/middleware/passwordValidation.ts`

### Implementation Details
```typescript
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password required'),

  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),

  handleValidationErrors
];
```

### Acceptance Criteria
- [ ] Strong password requirements enforced
- [ ] Password confirmation validation
- [ ] Clear error messages for each requirement
- [ ] Current password validation
- [ ] Integration with existing validation system

### Dependencies
- Task 2.1 (Password Change Service)

---

## Task 2.3: Add Password Change Controller Method
**Priority**: High | **Complexity**: Low | **Estimated Time**: 3 hours

### Description
Add password change endpoint to ProfileController with proper error handling.

### Files to Modify
- `src/controllers/profileController.ts`

### Implementation Details
```typescript
export class ProfileController {
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!._id;

      await UserService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
        requiresReauth: true
      });
    } catch (error) {
      // Handle errors (wrong current password, etc.)
    }
  }
}
```

### Acceptance Criteria
- [ ] Password change endpoint works correctly
- [ ] Proper error handling for wrong current password
- [ ] Success response indicates reauthentication needed
- [ ] Security logging for password changes
- [ ] Rate limiting considerations

### Dependencies
- Task 2.1 (Password Change Service)
- Task 2.2 (Password Validation)

---

## Task 2.4: Add Password Change Routes
**Priority**: Medium | **Complexity**: Low | **Estimated Time**: 2 hours

### Description
Add password change route to profile routes with appropriate middleware.

### Files to Modify
- `src/routes/profileRoutes.ts`

### Implementation Details
```typescript
// Add to existing profile routes
router.post('/change-password',
  authenticateToken,
  validatePasswordChange,
  ProfileController.changePassword
);
```

### Acceptance Criteria
- [ ] Route properly configured with middleware chain
- [ ] Correct HTTP method (POST)
- [ ] Authentication and validation applied
- [ ] Route integrated with existing profile routes

### Dependencies
- Task 2.3 (Password Change Controller)

---

## Task 2.5: Update Token Blacklist Service
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 4 hours

### Description
Extend TokenBlacklistService to support blacklisting all tokens for a specific user.

### Files to Modify
- `src/services/tokenBlacklistService.ts`

### Implementation Details
```typescript
export class TokenBlacklistService {
  // Existing methods remain...

  static async blacklistAllUserTokens(userId: string): Promise<void> {
    // Add all active tokens for user to blacklist
    // This ensures immediate logout after password change
  }

  static async getUserActiveTokens(userId: string): Promise<string[]> {
    // Get all active tokens for a user
    // Used before blacklisting all tokens
  }

  static async isUserTokenBlacklisted(userId: string, token: string): Promise<boolean> {
    // Check if specific user token is blacklisted
  }
}
```

### Acceptance Criteria
- [ ] All user tokens can be blacklisted at once
- [ ] Efficient token lookup and blacklisting
- [ ] Integration with existing blacklist system
- [ ] Proper error handling
- [ ] Performance considerations for large token lists

### Dependencies
- Task 2.1 (Password Change Service)

---

## Task 2.6: Create Password Change UI
**Priority**: Medium | **Complexity**: Medium | **Estimated Time**: 5 hours

### Description
Add password change form to profile template with client-side validation and AJAX submission.

### Files to Modify
- `views/profile/index.handlebars`
- `public/js/profile.js`
- `public/css/profile.css`

### Implementation Details
```handlebars
<!-- Add to profile template -->
<div class="profile-section">
  <h2>Change Password</h2>
  <form id="password-form" class="password-change-form">
    <div class="form-group">
      <label for="currentPassword">Current Password:</label>
      <input type="password" id="currentPassword" name="currentPassword" required>
    </div>

    <div class="form-group">
      <label for="newPassword">New Password:</label>
      <input type="password" id="newPassword" name="newPassword" required>
      <div class="password-requirements">
        <small>Must contain uppercase, lowercase, number, and special character</small>
      </div>
    </div>

    <div class="form-group">
      <label for="confirmPassword">Confirm Password:</label>
      <input type="password" id="confirmPassword" name="confirmPassword" required>
    </div>

    <button type="submit" class="btn btn-warning">Change Password</button>
  </form>
</div>
```

### Acceptance Criteria
- [ ] Form validation on client and server side
- [ ] Password strength indicator
- [ ] AJAX submission with proper error handling
- [ ] User feedback for successful changes
- [ ] Automatic logout after password change
- [ ] Mobile-friendly form design

### Dependencies
- Task 2.4 (Password Change Routes)

---

# PHASE 3: Admin Interface

## Task 3.1: Create Admin Authorization Middleware
**Priority**: High | **Complexity**: Low | **Estimated Time**: 3 hours

### Description
Create middleware to verify admin role access for administrative functions.

### Files to Create
- `src/middleware/adminAuth.ts`

### Implementation Details
```typescript
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};
```

### Acceptance Criteria
- [ ] Only admin users can access protected routes
- [ ] Proper error responses for unauthorized access
- [ ] Integration with existing auth system
- [ ] Security logging for admin access attempts
- [ ] Clear separation from regular user auth

### Dependencies
- Task 1.1 (User Model with role field)

---

## Task 3.2: Create Admin Controller
**Priority**: High | **Complexity**: High | **Estimated Time**: 8 hours

### Description
Create AdminController with user management, statistics, and administrative functions.

### Files to Create
- `src/controllers/adminController.ts`

### Implementation Details
```typescript
export class AdminController {
  // Render admin dashboard
  static async getDashboard(req: Request, res: Response): Promise<void> {
    // Admin dashboard with system overview
  }

  // User management view
  static async getUsersView(req: Request, res: Response): Promise<void> {
    // Render user management interface
  }

  // Get users list (API)
  static async getUsers(req: Request, res: Response): Promise<void> {
    // Paginated user list with search/filter
  }

  // Toggle user status
  static async toggleUserStatus(req: Request, res: Response): Promise<void> {
    // Activate/inactive user accounts
  }

  // Get system statistics
  static async getSystemStats(req: Request, res: Response): Promise<void> {
    // System-wide statistics for dashboard
  }

  // Get user details
  static async getUserDetails(req: Request, res: Response): Promise<void> {
    // Detailed user information for admin
  }
}
```

### Acceptance Criteria
- [ ] All admin functions properly implemented
- [ ] Pagination for large user lists
- [ ] Search and filter capabilities
- [ ] System statistics calculation
- [ ] Proper error handling
- [ ] Security logging for admin actions

### Dependencies
- Task 3.1 (Admin Authorization)
- Task 3.1 (Account Management Service)

---

## Task 3.3: Create Admin Service
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 6 hours

### Description
Create AdminService with methods for user management and system statistics.

### Files to Create
- `src/services/adminService.ts`

### Implementation Details
```typescript
export class AdminService {
  static async getAllUsers(
    page: number,
    limit: number,
    search?: string,
    status?: 'active' | 'inactive'
  ): Promise<PaginatedUsers> {
    // Get paginated user list with optional filtering
  }

  static async getSystemStats(): Promise<SystemStats> {
    // Calculate system-wide statistics
    return {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      inactiveUsers: await User.countDocuments({ isActive: false }),
      adminUsers: await User.countDocuments({ role: 'admin' }),
      totalNotes: await Note.countDocuments(),
      publicNotes: await Note.countDocuments({ isPublic: true }),
      sharedNotes: await Note.countDocuments({ 'sharedWith.0': { $exists: true } })
    };
  }

  static async toggleUserStatus(
    adminId: string,
    targetUserId: string
  ): Promise<void> {
    // Toggle user active status with logging
  }

  static async getUserWithStats(userId: string): Promise<UserWithStats> {
    // Get user details with note counts and sharing info
  }

}
```

### Acceptance Criteria
- [ ] Efficient user queries with pagination
- [ ] Accurate system statistics
- [ ] Proper error handling
- [ ] Performance optimization for large datasets

### Dependencies
- Task 3.2 (Admin Controller)

---

## Task 3.4: Create Admin Routes
**Priority**: Medium | **Complexity**: Low | **Estimated Time**: 3 hours

### Description
Set up Express routes for admin functionality with proper middleware chain.

### Files to Create
- `src/routes/adminRoutes.ts`

### Files to Modify
- `src/server.ts` (register admin routes)

### Implementation Details
```typescript
const router = express.Router();

// Apply admin auth to all routes
router.use(authenticateToken, requireAdmin);

// Admin dashboard
router.get('/', AdminController.getDashboard);

// User management
router.get('/users', AdminController.getUsersView);
router.get('/users/api', AdminController.getUsers);
router.put('/users/:id/status', AdminController.toggleUserStatus);
router.get('/users/:id', AdminController.getUserDetails);

// System statistics
router.get('/stats/api', AdminController.getSystemStats);

export default router;
```

### Acceptance Criteria
- [ ] All admin routes protected with middleware
- [ ] RESTful route design
- [ ] Routes registered in main application
- [ ] Proper parameter handling
- [ ] Clear separation from user routes

### Dependencies
- Task 3.3 (Admin Service)

---

## Task 3.5: Create Admin Dashboard Template
**Priority**: Medium | **Complexity**: High | **Estimated Time**: 8 hours

### Description
Create comprehensive admin dashboard with user management interface and system statistics.

### Files to Create
- `views/admin/dashboard.handlebars`
- `views/admin/users.handlebars`
- `views/admin/user-details.handlebars`
- `public/css/admin.css`
- `public/js/admin.js`

### Implementation Details
```handlebars
<!-- Admin Dashboard -->
<div class="admin-dashboard">
  <h1>Admin Dashboard</h1>

  <div class="stats-grid">
    <div class="stat-card">
      <h3>Total Users</h3>
      <span class="stat-number">{{stats.totalUsers}}</span>
      <span class="stat-change">+5 this week</span>
    </div>

    <div class="stat-card">
      <h3>Active Users</h3>
      <span class="stat-number">{{stats.activeUsers}}</span>
      <span class="stat-percentage">{{stats.activePercentage}}%</span>
    </div>

    <div class="stat-card">
      <h3>Total Notes</h3>
      <span class="stat-number">{{stats.totalNotes}}</span>
      <span class="stat-change">+12 today</span>
    </div>

    <div class="stat-card">
      <h3>Shared Notes</h3>
      <span class="stat-number">{{stats.sharedNotes}}</span>
      <span class="stat-percentage">{{stats.sharedPercentage}}%</span>
    </div>
  </div>

  <div class="admin-actions">
    <a href="/admin/users" class="btn btn-primary">Manage Users</a>
    <a href="/admin/stats" class="btn btn-secondary">View Reports</a>
  </div>
</div>

<!-- User Management Table -->
<div class="user-management">
  <div class="management-header">
    <h2>User Management</h2>
    <div class="search-controls">
      <input type="text" id="user-search" placeholder="Search users...">
      <select id="status-filter">
        <option value="">All Users</option>
        <option value="active">Active Only</option>
        <option value="inactive">Inactive Only</option>
      </select>
    </div>
  </div>

  <table class="user-table">
    <thead>
      <tr>
        <th>Email</th>
        <th>Display Name</th>
        <th>Role</th>
        <th>Status</th>
        <th>Created</th>
        <th>Notes</th>
        <th>Last Login</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="users-table-body">
      <!-- Populated via JavaScript -->
    </tbody>
  </table>

  <div class="pagination">
    <button id="prev-page" disabled>Previous</button>
    <span id="page-info">Page 1 of 1</span>
    <button id="next-page" disabled>Next</button>
  </div>
</div>
```

### Acceptance Criteria
- [ ] Comprehensive admin dashboard with statistics
- [ ] User management table with sorting/filtering
- [ ] Search functionality for users
- [ ] Status toggle buttons for user accounts
- [ ] Pagination for large user lists
- [ ] Responsive design for various screen sizes
- [ ] Real-time updates via AJAX
- [ ] Professional admin interface design

### Dependencies
- Task 3.4 (Admin Routes)

---

## Task 3.6: Add Admin Navigation
**Priority**: Low | **Complexity**: Low | **Estimated Time**: 2 hours

### Description
Add admin navigation links to main navigation for admin users.

### Files to Modify
- `views/layouts/main.handlebars`
- `views/partials/navbar.handlebars`

### Implementation Details
```handlebars
{{#if user}}
  {{#if (eq user.role 'admin')}}
    <li class="nav-item dropdown">
      <a href="#" class="nav-link dropdown-toggle">Admin</a>
      <ul class="dropdown-menu">
        <li><a href="/admin">Dashboard</a></li>
        <li><a href="/admin/users">Manage Users</a></li>
        <li><a href="/admin/stats">Statistics</a></li>
      </ul>
    </li>
  {{/if}}
  <li><a href="/profile">Profile</a></li>
{{/if}}
```

### Acceptance Criteria
- [ ] Admin links only visible to admin users
- [ ] Clean dropdown or section for admin options
- [ ] Consistent with existing navigation style
- [ ] Proper highlighting for current page

### Dependencies
- Task 3.5 (Admin Templates)

---

## Task 3.7: Implement Admin Client-Side JavaScript
**Priority**: Medium | **Complexity**: Medium | **Estimated Time**: 6 hours

### Description
Create JavaScript functionality for admin interface including AJAX operations and real-time updates.

### Files to Create/Modify
- `public/js/admin.js`

### Implementation Details
```javascript
class AdminUserManager {
  constructor() {
    this.currentPage = 1;
    this.pageSize = 20;
    this.searchQuery = '';
    this.statusFilter = '';

    this.bindEvents();
    this.loadUsers();
    this.loadStats();
  }

  async loadUsers(page = 1) {
    // Load users with pagination and filtering
  }

  async toggleUserStatus(userId) {
    // Toggle user active/inactive status
  }

  async searchUsers(query) {
    // Search users by email or display name
  }

  async loadStats() {
    // Load and display system statistics
  }

  renderUserTable(users) {
    // Render user table with action buttons
  }

  bindEvents() {
    // Bind click events for buttons and forms
  }

  showUserDetails(userId) {
    // Show detailed user information in modal
  }

  confirmUserStatusToggle(userId, currentStatus) {
    // Show confirmation dialog for status changes
  }
}

// Initialize admin manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.admin-dashboard')) {
    new AdminUserManager();
  }
});
```

### Acceptance Criteria
- [ ] AJAX loading of users and statistics
- [ ] Real-time search and filtering
- [ ] Confirmation dialogs for destructive actions
- [ ] Error handling and user feedback
- [ ] Loading indicators for async operations
- [ ] Keyboard shortcuts for common actions

### Dependencies
- Task 3.5 (Admin Templates)

---

## Task 3.8: Add Admin Rate Limiting
**Priority**: Medium | **Complexity**: Low | **Estimated Time**: 3 hours

### Description
Implement rate limiting specifically for admin actions to prevent abuse.

### Files to Create
- `src/middleware/adminRateLimit.ts`

### Files to Modify
- `src/routes/adminRoutes.ts`

### Implementation Details
```typescript
import rateLimit from 'express-rate-limit';

export const adminActionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 admin actions per window
  message: {
    success: false,
    message: 'Too many admin actions. Please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const adminStatusChangeLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 status changes per minute
  message: {
    success: false,
    message: 'Too many user status changes. Please wait before trying again.'
  }
});
```

### Acceptance Criteria
- [ ] Rate limits applied to admin routes
- [ ] Different limits for different action types
- [ ] Clear error messages when limits exceeded
- [ ] No impact on normal admin operations
- [ ] Configurable rate limit parameters

### Dependencies
- Task 3.4 (Admin Routes)

---

# PHASE 4: Testing & Polish

## Task 4.1: Write User Service Unit Tests
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 6 hours

### Description
Create comprehensive unit tests for all UserService methods including profile, password, and account management.

### Files to Create
- `tests/unit/services/userService.test.ts`

### Implementation Details
```typescript
describe('UserService', () => {
  describe('Profile Management', () => {
    it('should get user profile with statistics');
    it('should update user profile successfully');
    it('should reject invalid profile updates');
    it('should calculate accurate user statistics');
  });

  describe('Password Management', () => {
    it('should change password with valid current password');
    it('should reject incorrect current password');
    it('should enforce password strength requirements');
    it('should invalidate all tokens after password change');
    it('should update passwordChangedAt timestamp');
  });

});
```

### Acceptance Criteria
- [ ] >95% test coverage for UserService
- [ ] All edge cases covered
- [ ] Mock dependencies properly
- [ ] Clear test descriptions and assertions
- [ ] Fast execution times

### Dependencies
- All previous UserService tasks

---

## Task 4.2: Write Admin Service Unit Tests
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 5 hours

### Description
Create unit tests for AdminService methods including user management and statistics.

### Files to Create
- `tests/unit/services/adminService.test.ts`

### Implementation Details
```typescript
describe('AdminService', () => {
  describe('User Management', () => {
    it('should get paginated user list');
    it('should filter users by status');
    it('should search users by email');
    it('should toggle user status');
  });

  describe('System Statistics', () => {
    it('should calculate accurate user counts');
    it('should calculate note statistics');
    it('should handle empty database gracefully');
  });

  describe('User Details', () => {
    it('should get user with note statistics');
    it('should handle non-existent users');
  });
});
```

### Acceptance Criteria
- [ ] >95% test coverage for AdminService
- [ ] Database mocking for isolated tests
- [ ] Performance test for large datasets
- [ ] Error handling test cases

### Dependencies
- Task 3.3 (Admin Service)

---

## Task 4.3: Write Controller Integration Tests
**Priority**: High | **Complexity**: High | **Estimated Time**: 8 hours

### Description
Create integration tests for Profile and Admin controllers testing full request/response cycles.

### Files to Create
- `tests/integration/profile-api.test.ts`
- `tests/integration/admin-api.test.ts`

### Implementation Details
```typescript
describe('Profile API Integration', () => {
  beforeEach(async () => {
    // Set up test database and user
  });

  describe('Profile Management', () => {
    it('should get user profile');
    it('should update user profile');
    it('should require authentication for profile access');
  });

  describe('Password Management', () => {
    it('should change password successfully');
    it('should reject wrong current password');
    it('should invalidate tokens after password change');
  });

});

describe('Admin API Integration', () => {
  describe('Authorization', () => {
    it('should require admin role');
    it('should reject non-admin users');
  });

  describe('User Management', () => {
    it('should list users with pagination');
    it('should toggle user status');
    it('should get system statistics');
  });
});
```

### Acceptance Criteria
- [ ] Full HTTP request/response testing
- [ ] Authentication and authorization testing
- [ ] Database state verification
- [ ] Error response testing
- [ ] Performance testing for API endpoints

### Dependencies
- Task 5.1 and 5.2 (Unit Tests)

---

## Task 4.4: Write Authentication Middleware Tests
**Priority**: Medium | **Complexity**: Medium | **Estimated Time**: 4 hours

### Description
Test authentication middleware and admin authorization functionality.

### Files to Create/Modify
- `tests/unit/middleware/auth.test.ts`
- `tests/unit/middleware/adminAuth.test.ts`

### Implementation Details
```typescript
describe('Authentication Middleware', () => {

  describe('Admin Authorization', () => {
    it('should allow admin users');
    it('should reject non-admin users');
    it('should require authentication first');
  });
});
```

### Acceptance Criteria
- [ ] Comprehensive middleware testing
- [ ] Mock request/response objects
- [ ] Edge case coverage
- [ ] Security test cases

### Dependencies
- Task 3.2 (Auth Middleware Updates)
- Task 3.1 (Admin Authorization)

---

## Task 4.5: Add Comprehensive Error Handling
**Priority**: High | **Complexity**: Medium | **Estimated Time**: 5 hours

### Description
Implement robust error handling throughout the user management system with proper logging.

### Files to Modify
- `src/controllers/profileController.ts`
- `src/controllers/adminController.ts`
- `src/services/userService.ts`
- `src/services/adminService.ts`

### Implementation Details
```typescript
// Standardized error handling
try {
  // Operation logic
} catch (error) {
  logger.error('Operation failed', {
    operation: 'profileUpdate',
    userId: req.user._id,
    error: error.message,
    stack: error.stack
  });

  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: error.details
    });
  }

  if (error instanceof AuthorizationError) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
}
```

### Acceptance Criteria
- [ ] Consistent error response format
- [ ] Appropriate HTTP status codes
- [ ] Security event logging
- [ ] No sensitive data in error responses
- [ ] Graceful handling of all error types

### Dependencies
- All controller and service tasks

---

## Task 4.6: Implement Security Logging
**Priority**: High | **Complexity**: Low | **Estimated Time**: 3 hours

### Description
Add comprehensive security logging for all user management operations.

### Files to Modify
- `src/services/userService.ts`
- `src/services/adminService.ts`
- `src/controllers/profileController.ts`
- `src/controllers/adminController.ts`

### Implementation Details
```typescript
// Security event logging
logger.security('Profile updated', {
  userId,
  fields: Object.keys(updateData),
  timestamp: new Date(),
  ip: req.ip,
  userAgent: req.get('User-Agent')
});

logger.security('Password changed', {
  userId,
  timestamp: new Date(),
  ip: req.ip
});


logger.security('Admin action performed', {
  adminId,
  action: 'toggleUserStatus',
  targetUserId,
  newStatus,
  timestamp: new Date(),
  ip: req.ip
});
```

### Acceptance Criteria
- [ ] All security events logged
- [ ] Structured log format
- [ ] No sensitive data logged (passwords, tokens)
- [ ] IP and user agent tracking
- [ ] Audit trail for admin actions

### Dependencies
- Task 5.5 (Error Handling)

---

## Task 4.7: Add Input Sanitization
**Priority**: Medium | **Complexity**: Low | **Estimated Time**: 3 hours

### Description
Implement additional input sanitization for all user inputs beyond basic validation.

### Files to Modify
- `src/middleware/profileValidation.ts`
- `src/middleware/adminValidation.ts` (if created)

### Implementation Details
```typescript
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export const sanitizeProfileInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.displayName) {
    // Remove HTML tags and escape special characters
    req.body.displayName = DOMPurify.sanitize(req.body.displayName, { ALLOWED_TAGS: [] });
    req.body.displayName = validator.escape(req.body.displayName);
  }

  next();
};
```

### Acceptance Criteria
- [ ] All text inputs sanitized
- [ ] HTML tags removed from user input
- [ ] Special characters properly escaped
- [ ] No XSS vulnerabilities
- [ ] Performance impact minimal

### Dependencies
- All validation middleware tasks

---

## Task 4.8: Performance Optimization
**Priority**: Medium | **Complexity**: Medium | **Estimated Time**: 4 hours

### Description
Optimize database queries and implement caching for frequently accessed data.

### Files to Modify
- `src/services/adminService.ts`
- `src/services/userService.ts`
- Add caching utilities

### Implementation Details
```typescript
// Database query optimization
const getUsersOptimized = async (page: number, limit: number) => {
  const users = await User.find()
    .select('email displayName role isActive createdAt lastLoginAt')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(); // Use lean for better performance

  // Aggregate note counts in single query
  const userIds = users.map(user => user._id);
  const noteCounts = await Note.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);

  return users.map(user => ({
    ...user,
    noteCount: noteCounts.find(count => count._id.equals(user._id))?.count || 0
  }));
};

// Implement caching for system stats
const getSystemStatsWithCache = async () => {
  const cacheKey = 'system_stats';
  const cached = await cache.get(cacheKey);

  if (cached) return cached;

  const stats = await calculateSystemStats();
  await cache.set(cacheKey, stats, { ttl: 300 }); // 5 minutes

  return stats;
};
```

### Acceptance Criteria
- [ ] Database queries optimized with proper indexes
- [ ] Caching implemented for expensive operations
- [ ] Response times under 500ms for profile operations
- [ ] Pagination works efficiently with large datasets
- [ ] Memory usage optimized

### Dependencies
- All service implementation tasks

---

## Task 4.9: UI/UX Polish
**Priority**: Low | **Complexity**: Medium | **Estimated Time**: 6 hours

### Description
Polish the user interface with better styling, animations, and user experience improvements.

### Files to Modify
- `public/css/profile.css`
- `public/css/admin.css`
- `public/js/profile.js`
- `public/js/admin.js`

### Implementation Details
```css
/* Loading states and animations */
.loading {
  opacity: 0.6;
  pointer-events: none;
}

.btn.loading::after {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;
}

/* Success/error feedback */
.alert {
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.alert-success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.alert-error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

/* Responsive design improvements */
@media (max-width: 768px) {
  .user-table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
```

### Acceptance Criteria
- [ ] Professional, modern design
- [ ] Loading states for all async operations
- [ ] Success/error feedback for user actions
- [ ] Responsive design for mobile devices
- [ ] Smooth animations and transitions
- [ ] Accessibility compliance (ARIA labels, keyboard navigation)

### Dependencies
- All template and JavaScript tasks

---

## Task 4.10: Documentation and Deployment Preparation
**Priority**: Medium | **Complexity**: Low | **Estimated Time**: 4 hours

### Description
Update documentation and prepare deployment artifacts for the user management feature.

### Files to Create/Modify
- Update `README.md` API documentation
- Update `CLAUDE.md` with new architecture info
- Create migration documentation
- Update environment variable documentation

### Implementation Details
```markdown
## User Management API

### Profile Management
- `GET /profile` - User profile page
- `GET /profile/api` - Get profile data (JSON)
- `PUT /profile/api` - Update profile
- `POST /profile/change-password` - Change password

### Admin Management (Admin Only)
- `GET /admin` - Admin dashboard
- `GET /admin/users` - User management page
- `GET /admin/users/api` - Get users list (JSON)
- `PUT /admin/users/:id/status` - Toggle user status
- `GET /admin/stats/api` - System statistics

### Environment Variables
```env
# Admin Configuration
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password

# Profile Management
PROFILE_UPLOAD_LIMIT=5MB
```

### Database Migration
```bash
# Run migration to add user management fields
npm run migrate:user-management

# Seed admin user
npm run seed:admin-user
```
```

### Acceptance Criteria
- [ ] API documentation updated
- [ ] Architecture documentation updated
- [ ] Migration instructions provided
- [ ] Environment variables documented
- [ ] Deployment checklist created

### Dependencies
- All implementation tasks completed

---

## Task Completion Checklist

### Phase 1: Core Profile Management ✅
- [ ] Task 1.1: User Model Schema Updates
- [ ] Task 1.2: Database Migration Script
- [ ] Task 1.3: User Service Extensions
- [ ] Task 1.4: Profile Controller
- [ ] Task 1.5: Profile Validation Middleware
- [ ] Task 1.6: Profile Routes
- [ ] Task 1.7: Profile Templates
- [ ] Task 1.8: Profile Navigation Links

### Phase 2: Password Management ✅
- [ ] Task 2.1: Password Change Service
- [ ] Task 2.2: Password Validation Middleware
- [ ] Task 2.3: Password Change Controller Method
- [ ] Task 2.4: Password Change Routes
- [ ] Task 2.5: Token Blacklist Service Updates
- [ ] Task 2.6: Password Change UI

### Phase 3: Admin Interface ✅
- [ ] Task 3.1: Admin Authorization Middleware
- [ ] Task 3.2: Admin Controller
- [ ] Task 3.3: Admin Service
- [ ] Task 3.4: Admin Routes
- [ ] Task 3.5: Admin Dashboard Template
- [ ] Task 3.6: Admin Navigation
- [ ] Task 3.7: Admin Client-Side JavaScript
- [ ] Task 3.8: Admin Rate Limiting

### Phase 4: Testing & Polish ✅
- [ ] Task 4.1: User Service Unit Tests
- [ ] Task 4.2: Admin Service Unit Tests
- [ ] Task 4.3: Controller Integration Tests
- [ ] Task 4.4: Authentication Middleware Tests
- [ ] Task 4.5: Comprehensive Error Handling
- [ ] Task 4.6: Security Logging
- [ ] Task 4.7: Input Sanitization
- [ ] Task 4.8: Performance Optimization
- [ ] Task 4.9: UI/UX Polish
- [ ] Task 4.10: Documentation and Deployment

---

## Implementation Guidelines

### Development Workflow
1. Create feature branch: `git checkout -b implement-user-management`
2. Implement tasks in sequential order within each phase
3. Test each task thoroughly before moving to next
4. Commit frequently with descriptive messages
5. Update task checklist as tasks are completed

### Quality Standards
- **Code Coverage**: Maintain >90% test coverage
- **TypeScript**: Strict mode, no `any` types
- **Security**: Follow OWASP security practices
- **Performance**: Profile operations under load
- **Documentation**: Keep documentation in sync with implementation

### Risk Mitigation
- **Database Backup**: Backup before running migrations
- **Feature Flags**: Use feature flags for gradual rollout
- **Monitoring**: Set up logging and monitoring for new endpoints
- **Rollback Plan**: Prepare rollback procedures for each phase

This implementation plan provides a clear roadmap for building comprehensive user management functionality while maintaining code quality and security standards.