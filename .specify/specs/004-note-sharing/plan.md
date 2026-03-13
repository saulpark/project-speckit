# Note Sharing - Implementation Plan

**Spec ID**: 004
**Plan Version**: 1.0
**Created**: 2026-03-11
**Tech Stack**: Node.js, TypeScript, MongoDB, Express.js
**Dependencies**: 001-authentication ✅, 003-notes-crud ✅

## Implementation Strategy

Build note sharing functionality as modular extensions to the existing notes CRUD system. Implement public link sharing first (simpler) followed by user-specific sharing.

## Prerequisites

- **✅ Authentication System**: User identity and JWT middleware operational
- **✅ Notes CRUD**: Note model with `isPublic` field exists
- **✅ Note Security**: Ownership verification middleware in place
- **⚠️ Database Schema**: Need to add `sharedWith` field to Note model

## Architecture Overview

### Phase 1: Database Schema Extension
Extend the existing Note model to support sharing fields:
```typescript
// Add to existing Note schema
sharedWith: [{
  userId: { type: ObjectId, ref: 'User' },
  grantedAt: { type: Date, default: Date.now },
  grantedBy: { type: ObjectId, ref: 'User' } // Always the note owner
}]
```

### Phase 2: Public Link Sharing
- Extend existing note controller with toggle endpoint
- Add public note viewing route (no auth required)
- Update note ownership middleware to allow public access
- Add rate limiting for sharing operations

### Phase 3: User-Specific Sharing
- Share note via email lookup
- Add "Shared with me" view functionality
- Implement sharing revocation
- Add user notification system (optional)

## Implementation Phases

### Phase 1: Schema & Core Infrastructure
**Branch**: `feat/004-note-sharing-schema`
**Duration**: 2-3 hours
**Dependencies**: None

#### 1.1: Database Schema Updates
- **File**: `src/models/Note.ts`
- Add `sharedWith` array field to Note schema
- Add database migration script
- Update TypeScript interfaces

#### 1.2: Service Layer Extensions
- **File**: `src/services/noteService.ts`
- Add `shareNotePublic()` method
- Add `unshareNotePublic()` method
- Add `shareNoteWithUser()` method
- Add `unshareNoteWithUser()` method
- Add `getSharedNotes()` method

### Phase 2: Public Link Sharing
**Branch**: `feat/004-public-note-sharing`
**Duration**: 3-4 hours
**Dependencies**: Phase 1 complete

#### 2.1: Controller Extensions
- **File**: `src/controllers/noteController.ts`
- Add `togglePublicSharing()` endpoint
- Add `getPublicNote()` endpoint (no auth)
- Update existing endpoints to respect sharing

#### 2.2: Route Modifications
- **File**: `src/routes/noteRoutes.ts`
- Add `POST /notes/:id/share/public` - toggle public sharing
- Add `GET /public/notes/:id` - view public note (no auth)
- Update middleware chain for public routes

#### 2.3: Middleware Updates
- **File**: `src/middleware/noteOwnership.ts`
- Create `verifyNoteAccessOrPublic()` middleware
- Allow public access for `isPublic: true` notes
- Maintain ownership verification for modifications

#### 2.4: Security & Rate Limiting
- **File**: `src/middleware/noteSharingLimits.ts`
- Implement rate limiting for share/unshare operations
- Add sharing operation logging
- Prevent sharing abuse

### Phase 3: User-Specific Sharing
**Branch**: `feat/004-user-note-sharing`
**Duration**: 4-5 hours
**Dependencies**: Phase 2 complete

#### 3.1: User Lookup & Validation
- **File**: `src/services/userService.ts` (extend existing)
- Add `findUserByEmail()` method
- Add email validation for sharing
- Handle user not found scenarios

#### 3.2: Sharing Management
- **File**: `src/controllers/noteController.ts`
- Add `shareNoteWithUser()` endpoint
- Add `unshareNoteWithUser()` endpoint
- Add `getSharedNotes()` endpoint (user's received shares)
- Add `getNoteSharingInfo()` endpoint

#### 3.3: Route Extensions
- **File**: `src/routes/noteRoutes.ts`
- Add `POST /notes/:id/share/user` - share with specific user
- Add `DELETE /notes/:id/share/user/:userId` - revoke user access
- Add `GET /notes/shared-with-me` - list notes shared with current user
- Add `GET /notes/:id/sharing` - view sharing information

#### 3.4: Access Control Updates
- **File**: `src/middleware/noteOwnership.ts`
- Extend `verifyNoteAccess()` to check `sharedWith` array
- Allow read access for users in sharing list
- Maintain write restrictions (owner only)

### Phase 4: Frontend Integration (Optional)
**Branch**: `feat/004-note-sharing-ui`
**Duration**: 3-4 hours
**Dependencies**: Phases 1-3 complete

#### 4.1: Sharing UI Components
- Add sharing button to note view
- Create sharing modal/form
- Add public link display
- Add user email input for sharing

#### 4.2: Shared Notes Display
- Add "Shared with me" navigation
- Update note list views to show sharing status
- Add sharing indicators and badges

## Data Flow Architecture

### Public Link Sharing Flow
```
1. Owner: POST /notes/:id/share/public → Toggle isPublic flag
2. Anyone: GET /public/notes/:id → Read-only access (no auth)
3. Owner: POST /notes/:id/share/public → Revoke (isPublic = false)
```

### User-Specific Sharing Flow
```
1. Owner: POST /notes/:id/share/user {email} → Add to sharedWith array
2. Recipient: GET /notes/shared-with-me → List shared notes
3. Recipient: GET /notes/:id → Read access (via sharedWith check)
4. Owner: DELETE /notes/:id/share/user/:userId → Remove from sharedWith
```

## Security Considerations

### Authentication & Authorization
- Public routes bypass auth but maintain read-only access
- Shared note modifications require ownership verification
- Rate limiting on sharing operations prevents spam
- Input validation on email addresses for user sharing

### Data Privacy
- Shared notes expose only note content, not user's other notes
- No information leakage about note owner's private notes
- Sharing logs for audit trails
- Automatic cleanup when users/notes are deleted

### Access Control Matrix
| Action | Owner | Shared User | Public (isPublic=true) | Public (isPublic=false) |
|--------|--------|-------------|----------------------|------------------------|
| Read | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
| Share/Unshare | ✅ | ❌ | ❌ | ❌ |

## Database Impact

### Schema Changes
- Add `sharedWith` array field to existing Note documents
- No breaking changes to existing functionality
- Backward compatible (empty array for non-shared notes)

### Performance Considerations
- Index on `isPublic` field for public note queries
- Index on `sharedWith.userId` for shared note lookups
- Pagination for "shared with me" lists
- Query optimization for note access checks

### Migration Strategy
```javascript
// Migration: Add sharedWith field to existing notes
db.notes.updateMany(
  { sharedWith: { $exists: false } },
  { $set: { sharedWith: [] } }
);

// Add indexes for performance
db.notes.createIndex({ "isPublic": 1 });
db.notes.createIndex({ "sharedWith.userId": 1 });
```

## API Design

### Public Link Endpoints
```typescript
// Toggle public sharing
POST /notes/:id/share/public
Response: { success: boolean, isPublic: boolean, publicUrl?: string }

// View public note
GET /public/notes/:id
Response: { note: { id, title, content, createdAt, owner: { name } } }
```

### User Sharing Endpoints
```typescript
// Share with user
POST /notes/:id/share/user
Body: { email: string }
Response: { success: boolean, sharedWith: User[] }

// Revoke user access
DELETE /notes/:id/share/user/:userId
Response: { success: boolean, message: string }

// List shared notes
GET /notes/shared-with-me
Response: { notes: Note[], pagination: { ... } }

// Get sharing info
GET /notes/:id/sharing
Response: { isPublic: boolean, sharedWith: User[], canShare: boolean }
```

## Testing Strategy

### Unit Tests
- Note sharing service methods
- Sharing middleware functionality
- Email validation and user lookup
- Access control logic

### Integration Tests
- Public link sharing end-to-end
- User sharing workflows
- Permission verification
- Rate limiting functionality

### Security Tests
- Unauthorized access attempts
- Privilege escalation tests
- Data leakage verification
- Rate limiting validation

## Deployment Considerations

### Environment Variables
```bash
# Optional: Custom rate limits
NOTE_SHARING_RATE_LIMIT=10  # shares per hour per user
PUBLIC_NOTE_BASE_URL=https://yourapp.com/public/notes
```

### Production Readiness
- Database indexes created
- Rate limiting configured
- Error handling for edge cases
- Logging for sharing operations
- Health checks include sharing functionality

### Rollback Strategy
- Feature flags for sharing functionality
- Database migration rollback scripts
- Gradual rollout to test users first
- Monitoring for sharing-related errors

## Success Metrics

### Feature Adoption
- Number of notes made public
- Number of user-to-user shares
- Active users utilizing sharing features

### Performance Metrics
- Public note page load times
- Sharing operation response times
- Database query performance impact

### Security Metrics
- Rate limit triggers
- Unauthorized access attempts
- Sharing operation audit logs

## Risk Assessment

### High Risk
- **Public URL exposure**: Implement proper access controls
- **Performance impact**: Monitor database query performance
- **Spam sharing**: Rate limiting and abuse detection

### Medium Risk
- **User privacy**: Ensure no data leakage between users
- **Email validation**: Handle invalid/non-existent users gracefully

### Low Risk
- **UI complexity**: Sharing interface should be intuitive
- **Backward compatibility**: New fields are optional/defaulted

## Dependencies & Prerequisites

### Ready to Start
- ✅ Authentication system operational
- ✅ Notes CRUD system complete
- ✅ Database connection established
- ✅ Middleware architecture in place

### Blockers (None)
- All dependencies from specs 001 and 003 are complete
- No external service dependencies
- No breaking changes required

---

**Next Step**: Generate detailed task list with `claude SpecKit tasks .specify/specs/004-note-sharing/plan.md`