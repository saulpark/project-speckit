# User Management - Specification

**Spec ID**: 005
**Status**: Draft
**Created**: 2026-03-11
**Priority**: Medium
**Depends On**: 001-authentication ✅ Complete

## Overview
Administrative and self-service user management capabilities: profile editing, password change, and admin-level user oversight.

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

### FR-003: Admin User List (Admin Only)
- **Description**: Admins can view and manage all user accounts
- **Acceptance Criteria**:
  - Paginated user list with email, role, createdAt
  - View user note counts
  - User search and filtering capabilities
  - Protected behind admin role check
- **Priority**: Low

## Edge Cases & Constraints
- Password change requires current password (no anonymous change)
- Admin role must be defined (new `role` field on User model)
- Admin users cannot modify their own role or delete themselves

## Dependencies

### Feature Dependencies
- 001-authentication — User identity and JWT middleware
- 003-notes-crud — Existing note management functionality

### Technical Implementation
See [technical-implementation.md](./technical-implementation.md) for:
- Database schema extensions
- API endpoint specifications
- Security architecture details
- Frontend implementation guide
- Performance and testing strategy

## Future Enhancements
- OAuth / social login integration
- Two-factor authentication
- Login history and active sessions view
- GDPR data export capabilities
