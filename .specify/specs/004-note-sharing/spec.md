# Note Sharing - Specification

**Spec ID**: 004
**Status**: Draft
**Created**: 2026-03-11
**Priority**: Medium
**Depends On**: 003-notes-crud ✅ Complete

## Overview
Allow users to share individual notes with other users or via public links. Notes are private by default (`isPublic: false` is already modelled in the Note schema from spec 003).

## Requirements

### FR-001: Share Note via Public Link
- **Description**: Note owner can generate a shareable public link
- **Acceptance Criteria**:
  - Toggle `isPublic: true` on a note exposes it at a public URL
  - Public notes readable without authentication
  - Owner can revoke sharing at any time (set `isPublic: false`)
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
- 001-authentication — user identity and JWT middleware
- 003-notes-crud — Note model (`isPublic` field, `NoteService`)

### New Fields Required
- `Note.sharedWith: [{ userId: ObjectId, grantedAt: Date }]`

## Future Enhancements
- Shared note editing (collaborative)
- Share expiry (time-limited links)
- View count analytics for public notes
