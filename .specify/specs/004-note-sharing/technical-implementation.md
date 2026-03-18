# Note Sharing System - Technical Implementation

## Technology Stack

### Core Libraries
- **MongoDB/Mongoose**: Document database with ODM for sharing metadata
- **jsonwebtoken**: JWT-based authentication for sharing access control
- **express-validator**: Input validation for sharing endpoints
- **handlebars**: Server-side rendering for public note views
- **quill-delta-to-html**: Rich text content rendering for public notes

### Database Implementation (MongoDB)

#### Enhanced Note Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // Note owner reference
  title: String,
  content: {
    type: String,             // 'delta' | 'plain'
    data: Mixed,              // Quill Delta JSON or plain text
    preview: String           // Plain-text excerpt for previews
  },

  // Sharing Configuration
  isPublic: {                 // Public sharing toggle
    type: Boolean,
    default: false,
    index: true               // Indexed for public note queries
  },

  sharedWith: [{              // User-specific sharing
    userId: {
      type: ObjectId,
      ref: 'User',
      required: true
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    grantedBy: {
      type: ObjectId,
      ref: 'User',
      required: true
    }
  }],

  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### Database Indexes
```javascript
// Public note access optimization
db.notes.createIndex({ "isPublic": 1, "_id": 1 });

// User sharing queries optimization
db.notes.createIndex({ "sharedWith.userId": 1 });

// Owner note queries (existing)
db.notes.createIndex({ "userId": 1, "updatedAt": -1 });
```

## API Endpoints

### Sharing Management (Authenticated)

#### Toggle Public Sharing
```http
POST /notes/:id/share/public
Authorization: Bearer <token>

Response: {
  "success": true,
  "message": "Note is now public" | "Note is now private",
  "data": {
    "isPublic": boolean,
    "publicUrl": string | null
  }
}
```

#### Share with Specific User
```http
POST /notes/:id/share/user
Authorization: Bearer <token>
Content-Type: application/json

Body: {
  "email": "user@example.com"
}

Response: {
  "success": true,
  "message": "Note shared with user@example.com",
  "data": {
    "sharedWith": Array<ShareEntry>
  }
}
```

#### Remove User Access
```http
DELETE /notes/:id/share/user/:userId
Authorization: Bearer <token>

Response: {
  "success": true,
  "message": "User access removed"
}
```

#### Get Sharing Information
```http
GET /notes/:id/sharing
Authorization: Bearer <token>

Response: {
  "success": true,
  "data": {
    "noteId": string,
    "isPublic": boolean,
    "publicUrl": string | null,
    "sharedWith": Array<{
      "userId": string,
      "email": string,
      "grantedAt": Date,
      "grantedBy": string
    }>,
    "totalShares": number,
    "canShare": boolean
  }
}
```

### Public Access (No Authentication)

#### Public Note View (HTML)
```http
GET /public/notes/:id

Response: HTML template (public-view.handlebars)
- Clean, read-only note display
- No authentication required
- Only accessible if note.isPublic === true
```

#### Public Note Data (JSON API)
```http
GET /api/public/notes/:id

Response: {
  "success": true,
  "data": {
    "note": {
      "title": string,
      "content": object,
      "createdAt": Date,
      "updatedAt": Date,
      "owner": {
        "email": string  // Owner email only, no sensitive data
      }
    }
  }
}
```

### Shared Notes Access (Authenticated)

#### Get Notes Shared with Current User
```http
GET /notes/api/shared-with-me
Authorization: Bearer <token>

Response: {
  "success": true,
  "data": {
    "notes": Array<Note>,
    "pagination": PaginationInfo
  }
}
```

## Security Architecture

### Access Control Matrix

| Route | Owner | Shared User | Public | Middleware |
|-------|--------|-------------|---------|------------|
| `GET /notes/:id/view` | ✅ Read/Edit | ✅ Read Only | ❌ | `verifyNoteAccessOrShared` |
| `PUT /notes/:id` | ✅ Edit | ❌ | ❌ | `verifyNoteOwnership` |
| `DELETE /notes/:id` | ✅ Delete | ❌ | ❌ | `verifyNoteOwnership` |
| `POST /notes/:id/share/*` | ✅ Manage | ❌ | ❌ | `verifyNoteOwnership` |
| `GET /public/notes/:id` | ✅ | ✅ | ✅ (if public) | None |

### Middleware Implementation

#### verifyNoteAccessOrShared
```javascript
// Allows access if user is owner OR note is shared with user
const isOwner = note.userId.toString() === user.id.toString();
const isShared = note.sharedWith.some(
  share => share.userId.toString() === user.id.toString()
);

if (!isOwner && !isShared) {
  return res.status(404).json({ error: 'Note not found' });
}

req.noteAccess = {
  isOwner,
  isShared,
  canEdit: isOwner,
  canShare: isOwner
};
```

#### verifyNoteOwnership
```javascript
// Restricts access to note owners only
if (note.userId.toString() !== user.id.toString()) {
  return res.status(404).json({ error: 'Note not found' });
}
```

### Data Protection

#### Information Leakage Prevention
- **404 vs 403**: Always return 404 for unauthorized access (never 403)
- **User Enumeration**: Consistent responses regardless of user existence
- **Public URL Structure**: Uses MongoDB ObjectId (non-enumerable)
- **Owner Data**: Only email exposed in public notes, no sensitive information

#### Input Validation
```javascript
// Sharing validation rules
const shareUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('email').custom(async (email) => {
    const user = await User.findOne({ email, isActive: true });
    if (!user) throw new Error('User not found');
    return true;
  })
];
```

## Frontend Implementation

### Template Structure

#### Public Note View (`public-view.handlebars`)
```handlebars
{{! Clean, unauthenticated view for public notes }}
<div class="public-note">
  <div class="public-badge">🌐 Public Note</div>
  <h1>{{note.title}}</h1>
  <div class="note-content">{{{htmlContent}}}</div>
  <div class="note-meta">
    <span>Created: {{note.createdAt}}</span>
    <span>Updated: {{note.updatedAt}}</span>
  </div>
  <div class="powered-by">
    Shared via <a href="/">SpecKit Notes</a>
  </div>
</div>
```

#### Sharing Modal (`fresh-view.handlebars`)
```handlebars
{{! Integrated sharing controls for note owners }}
{{#if access.canShare}}
<div class="sharing-panel">
  <h3>Sharing Settings</h3>

  {{! Public sharing toggle }}
  <div class="sharing-item">
    {{#if note.isPublic}}
    <span>🌐 Public Link</span>
    <input type="text" value="{{publicUrl}}" readonly>
    <button onclick="copyPublicUrl()">Copy</button>
    <button onclick="togglePublicSharing()">Revoke</button>
    {{else}}
    <span>🔒 Private Note</span>
    <button onclick="togglePublicSharing()">Make Public</button>
    {{/if}}
  </div>

  {{! User sharing management }}
  {{#if note.sharedWith.length}}
  <div class="sharing-item">
    <span>👥 Shared Users ({{note.sharedWith.length}})</span>
    {{#each note.sharedWith}}
    <div class="shared-user">
      <span>{{this.user.email}}</span>
      <button onclick="unshareWithUser('{{this.userId}}')">Remove</button>
    </div>
    {{/each}}
  </div>
  {{/if}}
</div>

{{! Sharing modal }}
<div id="sharingModal" class="modal">
  <div class="modal-content">
    <h2>Share Note</h2>
    <input type="email" id="shareUserEmail" placeholder="Enter email">
    <button onclick="shareWithUser()">Share</button>
    <button onclick="closeSharingModal()">Cancel</button>
  </div>
</div>
{{/if}}
```

### JavaScript Client Implementation

#### Sharing Operations
```javascript
// Toggle public sharing
function togglePublicSharing() {
  fetch(`/notes/${noteId}/share/public`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      alert(result.message);
      window.location.reload();
    }
  });
}

// Share with specific user
function shareWithUser() {
  const email = document.getElementById('shareUserEmail').value.trim();

  fetch(`/notes/${noteId}/share/user`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      alert('✅ Note shared successfully!');
      closeSharingModal();
      window.location.reload();
    } else {
      alert('❌ Error: ' + result.message);
    }
  });
}

// Remove user access
function unshareWithUser(userId) {
  fetch(`/notes/${noteId}/share/user/${userId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      alert('✅ User access removed!');
      window.location.reload();
    }
  });
}
```

## Service Layer Architecture

### NoteService Extension
```javascript
class NoteService {
  // Public sharing toggle
  static async shareNotePublic(noteId, userId) {
    const note = await Note.findOne({ _id: noteId, userId });
    if (!note) throw new Error('Note not found');

    note.isPublic = !note.isPublic;
    await note.save();

    const publicUrl = note.isPublic
      ? `${process.env.PUBLIC_NOTE_BASE_URL}/public/notes/${noteId}`
      : null;

    return { isPublic: note.isPublic, publicUrl };
  }

  // User sharing management
  static async shareNoteWithUser(noteId, ownerId, userEmail) {
    const [note, targetUser] = await Promise.all([
      Note.findOne({ _id: noteId, userId: ownerId }),
      UserService.validateUserForSharing(userEmail)
    ]);

    if (!note) throw new Error('Note not found');
    if (targetUser.id === ownerId) throw new Error('Cannot share with yourself');

    const alreadyShared = note.sharedWith.some(
      share => share.userId.toString() === targetUser.id
    );
    if (alreadyShared) throw new Error('Note already shared with this user');

    note.sharedWith.push({
      userId: targetUser.id,
      grantedBy: ownerId,
      grantedAt: new Date()
    });

    await note.save();
    return note;
  }

  // Get public note (no authentication)
  static async getPublicNote(noteId) {
    const note = await Note.findOne({
      _id: noteId,
      isPublic: true
    }).populate('userId', 'email');

    if (!note) throw new Error('Public note not found');

    return {
      note: {
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        owner: {
          email: note.userId.email  // Safe to expose for public notes
        }
      }
    };
  }
}
```

### UserService Extension
```javascript
class UserService {
  static async validateUserForSharing(email) {
    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true
    });

    if (!user) {
      throw new Error('No active user found with this email address');
    }

    return {
      id: user._id.toString(),
      email: user.email
    };
  }

  static async getUserSharingDisplayInfo(userIds) {
    return User.find({
      _id: { $in: userIds },
      isActive: true
    }).select('_id email');
  }
}
```

## Performance Considerations

### Database Query Optimization
- **Compound indexes** for sharing queries
- **Selective population** of user data only when needed
- **Projection** to exclude sensitive fields in public endpoints

### Caching Strategy
- **Public notes**: Cacheable with CDN (long TTL)
- **Shared notes**: Short TTL due to dynamic access control
- **Sharing metadata**: Cache invalidation on sharing changes

### Content Processing
- **Quill Delta to HTML**: Server-side conversion for public views
- **Content sanitization**: XSS protection for rich text content
- **Preview generation**: Automatic excerpt creation for note lists

## Environment Configuration

```bash
# Public note sharing
PUBLIC_NOTE_BASE_URL=https://yourapp.com/public/notes

# Security
JWT_SECRET=<secure-secret>
JWT_EXPIRES_IN=24h

# Database
MONGODB_URI=mongodb://localhost:27017/projectspeckit

# Rate limiting for sharing operations
SHARE_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
SHARE_RATE_LIMIT_MAX_REQUESTS=10   # 10 shares per 15 min per IP
```

## Deployment Considerations

### Public URL Generation
- **Environment-based**: Different URLs for dev/staging/prod
- **Protocol detection**: Automatic HTTPS in production
- **CDN integration**: Support for custom domains

### Security Headers
```javascript
// Public note security headers
app.use('/public/notes', helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

### Monitoring & Analytics
- **Share activity tracking**: Note sharing events and patterns
- **Public access metrics**: View counts and referrer tracking
- **Performance monitoring**: Response times for public endpoints

---

**References:**
- [Note Sharing Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Task Breakdown](./tasks.md)
- [Authentication Technical Implementation](../001-authentication/technical-implementation.md)