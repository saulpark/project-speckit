# Project Constitution

## Core Principles (Non-Negotiable)

### Architecture
1. **Blueprint Pattern**: Every feature domain gets its own Flask Blueprint with dedicated routes, forms, and templates
2. **Application Factory**: Use `create_app()` pattern for Flask initialization and extension registration
3. **Service Layer**: Business logic lives in service classes, not in route handlers

### Security (Mandatory)
1. **Authentication Required**: All routes MUST use `@login_required` decorator (exceptions: auth routes, public sharing)
2. **CSRF Protection**: Every POST form MUST include CSRF tokens via `{{ form.hidden_tag() }}` or manual token
3. **Password Security**: Use Werkzeug password hashing, never plain text
4. **Ownership Enforcement**: Users can only access their own resources via helper functions like `_get_own_note_or_404()`

### Development Workflow (Non-Negotiable)
1. **Test-First**: Tests are mandatory before any git operation - enforced by pre-commit hooks
2. **Documentation Sync**: TestUpdate and UpdateProjectDocs agents MUST run before commits
3. **Dependency Management**: Use pinned versions in `requirements.txt`
4. **Virtual Environment**: Never commit `venv/`, always recreate from requirements

### Code Conventions
1. **URL Generation**: Always use `url_for('blueprint.route_name')` in templates, never hardcode paths
2. **Extension Pattern**: Global extensions (db, login_manager, csrf) defined in `app/extensions.py`
3. **Template Organization**: Templates mirror blueprint structure (`auth/`, `notes/`, `users/`)

### Data Integrity
1. **Foreign Keys**: Enforce relationships at database level
2. **Timestamps**: All models include created_at/updated_at
3. **JSON Content**: Use `content_delta` for rich content storage

### Quality Gates
1. **Pre-commit Testing**: pytest gate blocks commits if tests fail
2. **Documentation Updates**: Docs must stay in sync with code changes
3. **Code Review**: Use `/CodeReview` command for on-demand audits

## Technology Stack (Fixed)
- **Backend**: Flask 3.0.0+ with Blueprints
- **Database**: SQLAlchemy + SQLite
- **Auth**: Flask-Login (session-based)
- **Forms**: Flask-WTF + CSRFProtect
- **UI**: Bootstrap 5 + Bootstrap Icons + Jinja2
- **Testing**: pytest with in-memory SQLite

## Forbidden Patterns
- Hardcoded URLs in templates
- Route handlers with business logic
- Missing CSRF protection on state-changing requests
- Committing without running mandatory agents
- Models without proper relationships
- Authentication bypasses (except documented public routes)