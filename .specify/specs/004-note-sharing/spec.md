# Note Sharing - Specification

**Spec ID**: 004
**Status**: Complete ✅
**Created**: 2026-03-11
**Updated**: 2026-03-17
**Completed**: 2026-03-17
**Priority**: Medium
**Depends On**: 003-notes-crud ✅ Complete
**Branch**: `implement_sharing_notes`
**Backend**: Complete ✅ | **Frontend UI**: Complete ✅

## Overview
Allow users to share individual notes with other users or via public links. Notes are private by default and require explicit sharing by the owner to become accessible to others.

## Requirements

### FR-001: Share Note via Public Link
- **Description**: Note owner can generate a shareable public link
- **Acceptance Criteria**:
  - Owner can make a note publicly accessible via a shareable URL
  - Public notes are readable by anyone without requiring account registration
  - Owner can revoke public access at any time, making the note private again
  - Public URLs remain stable and do not expose sensitive information
- **Priority**: High

### FR-002: Share Note with Specific User
- **Description**: Note owner can grant read access to another registered user
- **Acceptance Criteria**:
  - Share by email address of recipient
  - Recipient sees shared notes in a "Shared with me" section
  - Owner can revoke individual user access
- **Priority**: Medium

### FR-003: Shared Note Permissions
- **Description**: Shared notes are read-only for recipients
- **Acceptance Criteria**:
  - Recipients cannot edit or delete shared notes
  - Only owner can modify sharing settings
  - No information leakage about other private notes
- **Priority**: High

## Edge Cases & Constraints
- Shared note ownership remains with original creator
- Deleting a note removes all sharing grants
- User deletion revokes all shares they were granted
- Rate limit public link generation to prevent abuse

## Dependencies

### Feature Dependencies
- 001-authentication — user identity and access control
- 003-notes-crud — existing note management functionality

### Technical Implementation
See [technical-implementation.md](./technical-implementation.md) for:
- Database schema extensions
- API endpoint specifications
- Security architecture
- Frontend implementation details

## Future Enhancements
- Shared note editing (collaborative)
- Share expiry (time-limited links)
- View count analytics for public notes
