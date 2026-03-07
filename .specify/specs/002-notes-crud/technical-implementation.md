# Notes CRUD Operations - Technical Implementation

## Database Schema

### Note Model (SQLAlchemy)
```python
class Note(db.Model):
    __tablename__ = 'notes'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=True)  # Optional title
    content_delta = db.Column(db.JSON, nullable=False)  # Rich text as JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Foreign key to User
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('notes', lazy=True))
```

### Database Relationships
- **One-to-Many**: User → Notes (one user owns many notes)
- **Foreign Key**: `user_id` references `users.id`
- **Cascade Behavior**: On user deletion, handle note orphaning (TBD)

## Route Implementation

### Blueprint Structure
```python
# app/notes/__init__.py
notes_bp = Blueprint('notes', __name__, url_prefix='/notes')

# Routes:
# /notes/ - GET (list user's notes)
# /notes/new - GET (form), POST (create)
# /notes/<int:id> - GET (view note)
# /notes/<int:id>/edit - GET (form), POST (update)
# /notes/<int:id>/delete - POST (delete)
```

### Route Protection
- **All routes protected**: Require `@login_required`
- **Ownership enforcement**: Helper function `_get_user_note_or_404(note_id)`
- **Authorization pattern**: Check `note.user_id == current_user.id`

## Form Implementation (WTForms)

### Note Creation/Edit Form
```python
class NoteForm(FlaskForm):
    title = StringField('Title', validators=[Length(max=200)])
    content = TextAreaField('Content', validators=[DataRequired()])
    submit = SubmitField('Save Note')

    def validate_content(self, content):
        # Validate JSON structure for content_delta
        try:
            json.loads(content.data)
        except ValueError:
            raise ValidationError('Invalid content format')
```

### Delete Confirmation Form
```python
class DeleteForm(FlaskForm):
    submit = SubmitField('Delete Note')
```

## Content Storage Implementation

### Rich Text Storage (JSON Delta)
- **Format**: Quill.js Delta format for rich text
- **Storage**: JSON column in PostgreSQL/SQLite
- **Fallback**: Plain text conversion for simple content
- **Validation**: JSON schema validation on save

#### Example Content Delta Structure
```json
{
    "ops": [
        {"insert": "Hello "},
        {"insert": "World", "attributes": {"bold": true}},
        {"insert": "\n"}
    ]
}
```

### Content Processing
```python
def process_content(raw_content):
    """Convert form content to Delta JSON"""
    if isinstance(raw_content, str):
        # Simple text → basic delta
        return {"ops": [{"insert": raw_content + "\n"}]}
    return raw_content  # Already in delta format

def render_content(content_delta):
    """Convert Delta JSON to HTML for display"""
    # Implementation depends on chosen renderer
    pass
```

## Database Operations

### Query Patterns

#### List User Notes
```python
@notes_bp.route('/')
@login_required
def list_notes():
    notes = Note.query.filter_by(user_id=current_user.id)\
                     .order_by(Note.updated_at.desc())\
                     .paginate(page=page, per_page=20)
    return render_template('notes/list.html', notes=notes)
```

#### Get User's Note or 404
```python
def _get_user_note_or_404(note_id):
    note = Note.query.filter_by(
        id=note_id,
        user_id=current_user.id
    ).first()
    if not note:
        abort(404)
    return note
```

#### Create Note
```python
@notes_bp.route('/new', methods=['POST'])
@login_required
def create_note():
    form = NoteForm()
    if form.validate_on_submit():
        note = Note(
            title=form.title.data or "Untitled",
            content_delta=process_content(form.content.data),
            user_id=current_user.id
        )
        db.session.add(note)
        db.session.commit()
        return redirect(url_for('notes.view_note', id=note.id))
```

#### Update Note
```python
@notes_bp.route('/<int:id>/edit', methods=['POST'])
@login_required
def update_note(id):
    note = _get_user_note_or_404(id)
    form = NoteForm(obj=note)
    if form.validate_on_submit():
        note.title = form.title.data or "Untitled"
        note.content_delta = process_content(form.content.data)
        note.updated_at = datetime.utcnow()
        db.session.commit()
        return redirect(url_for('notes.view_note', id=note.id))
```

#### Delete Note
```python
@notes_bp.route('/<int:id>/delete', methods=['POST'])
@login_required
def delete_note(id):
    note = _get_user_note_or_404(id)
    db.session.delete(note)
    db.session.commit()
    return redirect(url_for('notes.list_notes'))
```

## Template Implementation

### Template Structure
```
app/templates/notes/
├── list.html          # Note listing with pagination
├── view.html          # Single note display
├── new.html           # Note creation form
├── edit.html          # Note editing form
└── _note_form.html    # Shared form template
```

### Template Patterns

#### Note List Template
```html
<!-- Pagination with Flask-SQLAlchemy -->
{% for note in notes.items %}
    <div class="note-card">
        <h5>{{ note.title or "Untitled" }}</h5>
        <p>{{ moment(note.updated_at).fromNow() }}</p>
        <a href="{{ url_for('notes.view_note', id=note.id) }}">View</a>
    </div>
{% endfor %}
{{ render_pagination(notes) }}
```

#### Content Rendering
```html
<!-- Convert Delta JSON to HTML -->
<div class="note-content">
    {{ render_delta_content(note.content_delta) | safe }}
</div>
```

## Rich Text Editor Integration

### Quill.js Implementation (Future Enhancement)
```javascript
// Initialize Quill editor
var quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
            ['link', 'blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
        ]
    }
});

// Form submission
document.querySelector('form').onsubmit = function() {
    var content = document.querySelector('input[name=content]');
    content.value = JSON.stringify(quill.getContents());
};
```

### Fallback for Plain Text
- **Textarea**: Default form input for content
- **Conversion**: Plain text → basic Delta format
- **Progressive Enhancement**: Rich editor when JavaScript available

## Security Implementation

### Input Validation
- **XSS Prevention**: Sanitize HTML output from Delta rendering
- **JSON Validation**: Validate Delta structure before database save
- **Size Limits**: Maximum content size validation (configurable)

### Authorization Checks
```python
def check_note_ownership(f):
    @wraps(f)
    def decorated_function(id, *args, **kwargs):
        note = Note.query.get_or_404(id)
        if note.user_id != current_user.id:
            abort(404)  # Hide existence of other users' notes
        return f(id, *args, **kwargs)
    return decorated_function
```

## Performance Optimization

### Database Indexing
```sql
-- Indexes for performance
CREATE INDEX ix_notes_user_id ON notes (user_id);
CREATE INDEX ix_notes_updated_at ON notes (updated_at);
CREATE INDEX ix_notes_user_updated ON notes (user_id, updated_at DESC);
```

### Query Optimization
- **Pagination**: Limit results per page (20-50 notes)
- **Eager Loading**: Avoid N+1 queries for user relationships
- **Select Fields**: Only load necessary columns for list views

### Content Performance
- **Lazy Loading**: Load full content only when viewing individual notes
- **Compression**: Compress large content_delta JSON in database
- **Caching**: Cache rendered HTML for frequently accessed notes

## Error Handling

### Database Errors
```python
try:
    db.session.commit()
except IntegrityError:
    db.session.rollback()
    flash('Error saving note. Please try again.', 'error')
except Exception as e:
    db.session.rollback()
    current_app.logger.error(f'Note save error: {e}')
    flash('An unexpected error occurred.', 'error')
```

### JSON Processing Errors
```python
def safe_json_load(content):
    try:
        return json.loads(content)
    except (ValueError, TypeError):
        # Fallback to plain text delta
        return {"ops": [{"insert": str(content) + "\n"}]}
```

## Testing Strategy

### Unit Tests
- Note model methods and validation
- Content Delta processing functions
- Authorization helper functions

### Integration Tests
- CRUD operation flows
- Form submission and validation
- Template rendering with various content types

### Security Tests
- Cross-user note access attempts
- XSS in note content
- SQL injection in note queries
- CSRF protection on forms

## Migration Considerations

### Database Migrations
```python
# Migration: Add Notes table
def upgrade():
    op.create_table('notes',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('title', sa.String(200)),
        sa.Column('content_delta', sa.JSON),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id')),
    )
    op.create_index('ix_notes_user_id', 'notes', ['user_id'])
```

### Data Migration
- Convert existing plain text notes to Delta format
- Preserve timestamps and ownership relationships
- Validate content integrity post-migration

## Future Enhancements

### Search Functionality
- Full-text search in note content
- Search index on title and rendered content
- Advanced filtering (date, tags, etc.)

### Note Categories/Tags
- Many-to-many relationship: Note ↔ Tag
- Tag management interface
- Filtering and organization by tags

### Export/Import
- Export notes as JSON, Markdown, PDF
- Import from other note-taking applications
- Backup and restore functionality