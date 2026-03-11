# User Management - Specification

**Spec ID**: 005
**Status**: Draft
**Created**: 2026-03-11
**Priority**: Medium
**Depends On**: 001-authentication ✅ Complete

## Overview
Administrative and self-service user management capabilities: profile editing, account deactivation, password change, and admin-level user oversight.

## Requirements

### FR-001: User Profile Management
- **Description**: Authenticated users can view and update their profile
- **Acceptance Criteria**:
  - View current profile (email, createdAt, note count)
  - Update display name (if added to User model)
  - Profile page accessible at `/profile`
- **Priority**: High

### FR-002: Password Change
- **Description**: Authenticated users can change their password
- **Acceptance Criteria**:
  - Requires current password confirmation
  - New password must meet strength requirements
  - All existing tokens invalidated after password change
  - Confirmation email (future enhancement)
- **Priority**: High

### FR-003: Account Deactivation
- **Description**: Users can deactivate their own account
- **Acceptance Criteria**:
  - Sets `isActive: false` on User document
  - All active tokens immediately blacklisted
  - Deactivated accounts cannot log in
  - Notes are preserved (not deleted)
- **Priority**: Medium

### FR-004: Admin User List (Admin Only)
- **Description**: Admins can view and manage all user accounts
- **Acceptance Criteria**:
  - Paginated user list with email, status, createdAt
  - Ability to activate/deactivate accounts
  - View user note counts
  - Protected behind admin role check
- **Priority**: Low

## Edge Cases & Constraints
- Password change requires current password (no anonymous change)
- Account deactivation is reversible (admin can reactivate)
- Admin role must be defined (new `role` field on User model or separate collection)

## Dependencies

### Feature Dependencies
- 001-authentication — User model, JWT middleware, password hashing utilities
- 003-notes-crud — Note counts on user profile

### Model Changes Required
- `User.role: 'user' | 'admin'` (default: `'user'`)
- `User.displayName: String` (optional)

## Future Enhancements
- OAuth / social login integration
- Two-factor authentication
- Login history and active sessions view
- GDPR data export
