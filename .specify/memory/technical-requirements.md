# Technical Requirements

## Technology Stack

### Backend Framework
- **Flask**: Version 3.0.0+ with Blueprint pattern
- **WSGI Server**: Development server for local, production-grade server for deployment

### Database
- **ORM**: SQLAlchemy with Flask-SQLAlchemy extension
- **Database**: SQLite for development and production
- **Migrations**: Flask-Migrate for schema versioning

### Authentication & Security
- **Session Management**: Flask-Login for user session handling
- **CSRF Protection**: Flask-WTF with CSRFProtect extension
- **Password Hashing**: Werkzeug security utilities
- **Form Handling**: Flask-WTF for form validation and rendering

### Frontend
- **Template Engine**: Jinja2 (Flask default)
- **CSS Framework**: Bootstrap 5.x
- **Icons**: Bootstrap Icons
- **JavaScript**: Vanilla JS, minimal dependencies

### Testing & Development
- **Testing Framework**: pytest with fixtures
- **Test Database**: In-memory SQLite for fast test execution
- **Development Tools**: Flask CLI commands for database operations

## Database Schema Requirements

### Model Specifications
- **Timestamps**: All models must include `created_at` and `updated_at` columns
- **Foreign Keys**: Enforce referential integrity at database level
- **Content Storage**: Use JSON column type for rich content (`content_delta`)

### Core Tables
- `users`: User accounts and authentication
- `notes`: Note content and metadata
- `note_sharing`: Note sharing permissions and access control

## Authentication Implementation

### Security Requirements
- **Password Storage**: Use `werkzeug.security.generate_password_hash()`
- **Session Configuration**: Secure session cookies with proper expiration
- **CSRF Tokens**: Include in all state-changing forms via `{{ form.hidden_tag() }}`

### Authorization Patterns
- **Route Protection**: Use `@login_required` decorator on protected routes
- **Ownership Validation**: Helper functions like `_get_own_note_or_404()` for resource access
- **Public Routes**: Explicitly document exceptions (auth endpoints, public sharing)

## Application Structure

### Blueprint Organization
```
app/
├── __init__.py          # Application factory
├── extensions.py        # Global extension instances
├── models/              # SQLAlchemy models
├── auth/               # Authentication blueprint
├── notes/              # Notes management blueprint
├── users/              # User management blueprint
└── templates/          # Jinja2 templates (mirroring blueprint structure)
```

### Extension Configuration
- Global extensions (db, login_manager, csrf) defined in `app/extensions.py`
- Extensions initialized in application factory pattern
- Blueprint registration in `create_app()` function

## Development Environment

### Python Environment
- **Virtual Environment**: Required for isolation
- **Dependencies**: Pinned versions in `requirements.txt`
- **Python Version**: 3.8+ recommended

### Database Development
- **Local Database**: SQLite file in project root
- **Test Database**: In-memory SQLite for test isolation
- **Schema Management**: Flask-Migrate for version control

### File Organization
- **Static Files**: CSS, JavaScript, images in `app/static/`
- **Templates**: Organized by blueprint in `app/templates/`
- **Configuration**: Environment-specific settings

## Testing Requirements

### Test Structure
- **Framework**: pytest with Flask testing utilities
- **Database**: Separate test database (in-memory SQLite)
- **Fixtures**: Reusable test data setup
- **Coverage**: Aim for high coverage on business logic

### Test Categories
- **Unit Tests**: Service layer and utility functions
- **Integration Tests**: Route handlers and database operations
- **Security Tests**: Authentication and authorization flows

## Performance & Deployment

### Development Performance
- **Database**: SQLite adequate for development and small deployments
- **Static Files**: Served by Flask in development
- **Session Storage**: Server-side session storage

### Production Considerations
- **WSGI Server**: Gunicorn, uWSGI, or similar for production
- **Static Files**: Consider CDN or reverse proxy for static assets
- **Database**: SQLite suitable for single-instance deployments

## Dependencies

### Core Dependencies (requirements.txt)
```
Flask>=3.0.0
Flask-Login
Flask-WTF
Flask-SQLAlchemy
Flask-Migrate
Werkzeug
SQLAlchemy
WTForms
```

### Development Dependencies
```
pytest
pytest-flask
coverage
```

## Security Specifications

### Input Validation
- **Forms**: WTForms validators for all user input
- **CSRF**: Mandatory on all state-changing requests
- **XSS Prevention**: Jinja2 auto-escaping enabled

### Session Security
- **Secure Cookies**: HTTPOnly and Secure flags in production
- **Session Expiration**: Reasonable timeout periods
- **Remember Me**: Secure implementation with token rotation

### Data Protection
- **Password Policy**: Minimum requirements for user passwords
- **Data Sanitization**: Proper input cleaning and validation
- **Error Handling**: Generic error messages to prevent information leakage