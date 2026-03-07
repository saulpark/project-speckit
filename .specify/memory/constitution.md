# Project Constitution

## Core Principles (Non-Negotiable)

### Architecture Philosophy
1. **Modular Design**: Features are organized into distinct, self-contained modules
2. **Separation of Concerns**: Clear separation between presentation, business logic, and data layers
3. **Factory Pattern**: Application initialization follows established factory patterns
4. **Service Layer Architecture**: Business logic is isolated from web framework concerns

### Security Philosophy (Mandatory)
1. **Authentication First**: All application areas require authentication unless explicitly designed for public access
2. **Data Protection**: All user input must be validated and sanitized
3. **Secure by Default**: Security measures are built-in, not optional add-ons
4. **Resource Ownership**: Users can only access resources they own or have explicit permission to use

### Development Philosophy (Non-Negotiable)
1. **Test-Driven Quality**: Code quality is enforced through automated testing
2. **Documentation Driven**: Code changes must be accompanied by documentation updates
3. **Reproducible Environments**: Development environment setup is automated and consistent
4. **Version Controlled Dependencies**: All dependencies are explicitly versioned

### Code Quality Standards
1. **Explicit Over Implicit**: Code behavior should be predictable and clearly expressed
2. **Template Consistency**: User interface follows consistent patterns and organization
3. **Maintainable Architecture**: Code structure supports long-term maintenance and extension

### Data Integrity Principles
1. **Referential Integrity**: Data relationships are enforced at the appropriate level
2. **Audit Trails**: Important data changes are tracked with timestamps
3. **Structured Storage**: Complex data is stored in appropriate, queryable formats

### Quality Assurance
1. **Automated Testing**: Quality is enforced through automated checks before deployment
2. **Living Documentation**: Documentation evolves with the codebase
3. **Continuous Review**: Code quality is monitored through regular review processes

## Prohibited Practices
- **Hardcoded Dependencies**: URLs, file paths, or configuration values embedded in code
- **Mixed Responsibilities**: Web handling logic mixed with business logic
- **Security Shortcuts**: Bypassing established security measures
- **Undisciplined Commits**: Code changes without proper testing and documentation
- **Broken Contracts**: Data models that don't enforce their declared relationships
- **Unauthorized Access**: Authentication bypasses without explicit documentation and approval

## Implementation Reference
Technical implementation details, specific libraries, versions, and configuration requirements are documented separately in `technical-requirements.md`.