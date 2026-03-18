# User Management System - Technical Implementation

## Technology Stack

### Core Libraries
- **MongoDB/Mongoose**: Document database with ODM for user management
- **jsonwebtoken**: JWT-based authentication with token blacklisting
- **bcrypt**: Password hashing with 12 salt rounds
- **express-validator**: Input validation for user management endpoints
- **handlebars**: Server-side rendering for profile and admin interfaces
- **express-rate-limit**: Rate limiting for sensitive operations

## Database Implementation (MongoDB)

### Enhanced User Schema
```javascript
{
  _id: ObjectId,
  email: String,               // Unique email address
  passwordHash: String,        // bcrypt hashed password
  isActive: Boolean,          // Account status (default: true)

  // Profile Management Fields
  displayName: String,         // Optional display name (max 50 chars)
  role: String,               // 'user' | 'admin' (default: 'user')

  // Tracking Fields
  passwordChangedAt: Date,     // Last password change timestamp
  lastLoginAt: Date,          // Last successful login

  // Timestamps
  createdAt: Date,            // Account creation
  updatedAt: Date             // Last modification
}
```

### Database Indexes
```javascript
// Performance indexes for user management
{ email: 1, isActive: 1 }        // Email lookup with status
{ role: 1 }                      // Admin queries
{ isActive: 1, createdAt: -1 }   // Active user listings
{ email: 1, role: 1 }           // Admin user search
```

### Migration Strategy
```javascript
// Add new fields to existing users
db.users.updateMany(
  { role: { $exists: false } },
  { $set: {
    role: 'user',
    displayName: null,
    passwordChangedAt: null,
    lastLoginAt: null
  }}
);
```

## API Architecture

### Profile Management Endpoints
```http
# Profile Operations
GET    /profile                 # Profile management page
GET    /profile/api             # Get profile data (JSON)
PUT    /profile/api             # Update profile data
GET    /profile/api/stats       # User statistics

# Password Management
POST   /profile/change-password # Change user password

```

### Admin Management Endpoints
```http
# Admin Interface
GET    /admin                   # Admin dashboard
GET    /admin/users             # User management page
GET    /admin/users/api         # Get users list (JSON)
PUT    /admin/users/:id/status  # Toggle user active status
GET    /admin/users/:id         # Get user details
GET    /admin/stats/api         # System statistics
```

### API Response Format
```json
{
  "success": true,
  "message": "Operation description",
  "data": { /* response payload */ },
  "timestamp": "2026-03-18T..."
}
```

## Backend Architecture

### Service Layer Design
```typescript
// UserService - Profile management
class UserService {
  static async getProfile(userId): Promise<UserProfileData>
  static async updateProfile(userId, data): Promise<void>
  static async getUserStats(userId): Promise<UserStatsData>
  static async changePassword(userId, current, new): Promise<void>
}

// AdminService - User management
class AdminService {
  static async getAllUsers(page, limit): Promise<PaginatedUsers>
  static async toggleUserStatus(adminId, targetId): Promise<void>
  static async getSystemStats(): Promise<SystemStats>
}
```

### Controller Layer
```typescript
// ProfileController - HTTP request handling
class ProfileController {
  static async getProfileView(req, res): Promise<void>     // Render profile page
  static async getProfile(req, res): Promise<void>         // Get profile data
  static async updateProfile(req, res): Promise<void>      // Update profile
  static async changePassword(req, res): Promise<void>     // Change password
}

// AdminController - Admin operations
class AdminController {
  static async getDashboard(req, res): Promise<void>       // Admin dashboard
  static async getUsers(req, res): Promise<void>           // User management
  static async toggleUserStatus(req, res): Promise<void>   // Status management
  static async getSystemStats(req, res): Promise<void>     // System statistics
}
```

### Middleware Architecture
```typescript
// Authentication & Authorization
const authenticateToken     // JWT token verification
const authenticateWeb      // Web session authentication
const requireAdmin         // Admin role verification

// Input Validation & Sanitization
const validateProfileUpdate      // Profile data validation
const validatePasswordChange    // Password validation with strength checking
const validateAccountDeactivation // Deactivation confirmation
const sanitizeProfileInput      // Input sanitization and XSS prevention

// Security & Rate Limiting
const profileRateLimit          // General profile operations (30/15min)
const passwordChangeRateLimit   // Password changes (3/15min)
const adminActionRateLimit      // Admin operations (50/5min)
```

## Frontend Implementation

### Profile Management Interface
```handlebars
<!-- Profile template structure -->
- Profile header with user information
- Account information form (email, displayName, role, memberSince)
- User statistics dashboard (note counts, activity)
- Password change form with strength meter
- Real-time validation and feedback
- Loading states and error handling
```

### Admin Management Interface
```handlebars
<!-- Admin template structure -->
- System statistics dashboard
- User management table with pagination
- Search and filter functionality
- User status toggle controls
- Bulk operation capabilities
- Real-time updates via AJAX
```

### Client-Side Features
```javascript
// ProfileManager class handles:
- Form submission with AJAX
- Password strength validation
- Real-time input feedback
- Modal management for confirmations
- Loading states and error handling
- Auto-logout after sensitive operations

// AdminUserManager class handles:
- User table pagination and search
- Status toggle with confirmations
- Real-time statistics updates
- Bulk operations
- Advanced filtering and sorting
```

## Security Architecture

### Authentication & Authorization
```typescript
// Multi-layer security model
1. JWT Token Authentication
   - HTTP-only cookies for web sessions
   - Bearer tokens for API access
   - Token blacklisting on logout/password change

2. Role-Based Access Control
   - User role: Standard user operations
   - Admin role: User management and system access
   - Middleware enforcement at route level

3. Operation-Specific Security
   - Password confirmation for sensitive operations
   - Admin privilege verification
```

### Input Validation & Sanitization
```typescript
// Comprehensive validation pipeline
1. Schema Validation (express-validator)
   - Field type and format checking
   - Length and content constraints
   - Custom business rule validation

2. Input Sanitization
   - HTML tag removal
   - XSS prevention
   - SQL injection protection
   - Whitespace normalization

3. Password Security
   - Strength requirements (8+ chars, mixed case, numbers, special)
   - Common pattern detection
   - Repetition prevention
   - bcrypt hashing (12 salt rounds)
```

### Rate Limiting Strategy
```typescript
// Tiered rate limiting based on operation sensitivity
const rateLimits = {
  profileUpdate: { requests: 30, window: '15min' },
  passwordChange: { requests: 3, window: '15min' },
  accountDeactivation: { requests: 2, window: '1hour' },
  adminActions: { requests: 50, window: '5min' }
};
```

### Security Logging
```typescript
// Comprehensive audit trail
const securityEvents = [
  'profile_updated',           // Profile modifications
  'password_changed',          // Password updates
  'admin_action_performed',    // Administrative operations
  'failed_authentication',     // Security violations
  'rate_limit_exceeded'        // Abuse attempts
];

// Log format includes: userId, action, timestamp, IP, userAgent, metadata
```

## Performance Optimizations

### Database Performance
```javascript
// Optimized queries and aggregations
- Indexed fields for fast lookups
- Lean queries for better performance
- Aggregation pipelines for statistics
- Connection pooling for scalability

// Example: User statistics aggregation
const stats = await Note.aggregate([
  { $match: { userId: user._id } },
  { $group: {
    _id: null,
    noteCount: { $sum: 1 },
    publicNotes: { $sum: { $cond: ['$isPublic', 1, 0] }},
    sharedNotes: { $sum: { $cond: [{ $gt: ['$sharedWith', []] }, 1, 0] }}
  }}
]);
```

### Caching Strategy
```typescript
// Multi-level caching approach
1. User Profile Cache (5min TTL)
   - Profile data and statistics
   - Role and permission information

2. System Statistics Cache (15min TTL)
   - Admin dashboard metrics
   - User count aggregations

3. Session Cache (24h TTL)
   - Authentication tokens
   - User session data
```

### Frontend Optimization
```typescript
// Performance enhancements
- Lazy loading for admin user tables
- Debounced search and filtering
- Optimistic UI updates
- Client-side validation to reduce server load
- Efficient DOM manipulation
- Image and asset optimization
```

## Testing Strategy

### Unit Testing
```typescript
// Service layer testing
describe('UserService', () => {
  describe('Profile Management', () => {
    test('getProfile returns user data');
    test('updateProfile validates input');
    test('getUserStats calculates correctly');
  });

  describe('Password Management', () => {
    test('changePassword validates current password');
    test('changePassword hashes new password');
    test('changePassword invalidates tokens');
  });
});
```

### Integration Testing
```typescript
// API endpoint testing
describe('Profile API', () => {
  test('GET /profile/api requires authentication');
  test('PUT /profile/api validates input data');
  test('POST /profile/change-password enforces rate limits');
});
```

### Security Testing
```typescript
// Security validation
describe('Security Tests', () => {
  test('Admin endpoints reject non-admin users');
  test('Rate limiting prevents abuse');
  test('Input validation prevents XSS');
  test('Password changes invalidate all tokens');
});
```

## Deployment Considerations

### Environment Configuration
```env
# User Management Settings
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password
PROFILE_UPLOAD_LIMIT=5MB

# Security Settings
JWT_SECRET=your-jwt-secret
PASSWORD_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Database Settings
MONGODB_URI=mongodb://localhost:27017/speckit
```

### Migration Checklist
- [ ] Database schema migration completed
- [ ] Admin user seeded
- [ ] Rate limiting configured
- [ ] Security logging enabled
- [ ] Performance monitoring set up
- [ ] Backup procedures verified

### Monitoring & Observability
```typescript
// Key metrics to monitor
const metrics = [
  'user_registration_rate',
  'password_change_frequency',
  'admin_action_volume',
  'security_event_frequency',
  'api_response_times',
  'error_rates_by_endpoint'
];
```

## Future Enhancements

### Advanced Features
- **Two-Factor Authentication**: SMS/TOTP support
- **OAuth Integration**: Social login providers
- **Session Management**: Active session monitoring
- **Audit Logging**: Enhanced security audit trails
- **GDPR Compliance**: Data export and deletion tools

### Scalability Improvements
- **Redis Caching**: Distributed caching layer
- **Database Sharding**: Horizontal scaling support
- **Load Balancing**: Multi-instance deployment
- **CDN Integration**: Static asset optimization

### Security Enhancements
- **Threat Detection**: Automated security monitoring
- **IP Whitelisting**: Location-based access control
- **Device Fingerprinting**: Enhanced authentication security
- **Security Headers**: Advanced CSP and HSTS policies

This technical implementation provides a robust, secure, and scalable user management system that integrates seamlessly with the existing note-taking application architecture.