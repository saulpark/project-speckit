# Project Constitution

## 📜 Foundational Principles

### Spec-Kit Methodology
This project follows the **Spec-Kit approach** with the following core principles:

1. **Specification-Driven Development**: All features must have corresponding `.specify/specs/*.md` files
2. **Documentation-First**: Code changes require documentation updates
3. **Quality Gates**: Pre-commit hooks enforce quality standards
4. **Agent-Driven Automation**: Use Claude agents for maintenance tasks

### Architecture Principles

#### 🏗️ **Code Structure**
- **Layered Architecture**: Controllers → Services → Models → Utils
- **Single Responsibility**: Each module has one clear purpose
- **Dependency Injection**: Avoid tight coupling between layers
- **Error Boundaries**: Proper error handling at each layer

#### 🔒 **Security-First**
- **Input Validation**: All user inputs must be validated
- **Authentication**: JWT-based stateless authentication
- **Authorization**: Role-based access control (when applicable)
- **Secrets Management**: No secrets in code, use environment variables

#### 📊 **Data Management**
- **Schema Validation**: All data models must have schema validation
- **Query Optimization**: Use indexed queries and avoid N+1 problems
- **Transaction Safety**: Use transactions for multi-step operations
- **Backup Strategy**: Data must be recoverable

### Development Standards

#### 📝 **Code Quality**
- **TypeScript Strict Mode**: All code must be strictly typed
- **ESLint Compliance**: No linting errors allowed
- **Test Coverage**: Minimum 80% test coverage for new code
- **Documentation**: All public APIs must be documented

#### 🔄 **Version Control**
- **Branch Strategy**: Feature branches with PR reviews
- **Commit Messages**: Conventional commit format
- **Pre-commit Hooks**: All quality gates must pass
- **No Direct Main**: All changes via pull requests

#### 🚀 **Deployment**
- **Environment Parity**: Dev/staging/prod environments must match
- **Configuration**: Environment-based configuration only
- **Health Checks**: All services must expose health endpoints
- **Monitoring**: Logging and metrics for all critical paths

### Compliance Rules

#### 🚫 **Prohibited Practices**
- Hardcoded secrets or API keys
- Direct database access from controllers
- Synchronous file operations in request handlers
- console.log in production code (use proper logging)
- Circular dependencies between modules

#### ✅ **Required Practices**
- Input validation for all endpoints
- Error handling for all async operations
- Logging for all security-related events
- Unit tests for all business logic
- Integration tests for all API endpoints

#### 🎯 **Performance Standards**
- API response times < 200ms for simple operations
- Database queries must use appropriate indexes
- No N+1 query patterns
- Proper caching for read-heavy operations

### Governance

#### 👥 **Review Requirements**
- All code changes require peer review
- Security-sensitive changes require security review
- Architecture changes require team consensus
- Breaking changes require documentation updates

#### 📋 **Quality Metrics**
- Code coverage must not decrease
- Build times must remain under 2 minutes
- Test suites must complete under 30 seconds
- Security scans must pass without HIGH/CRITICAL issues

### Enforcement

This constitution is enforced through:
- **Pre-commit hooks**: Automated compliance checking
- **CI/CD pipelines**: Continuous validation
- **Code reviews**: Peer enforcement
- **Documentation**: Living documentation of decisions

### Amendment Process

Constitution changes require:
1. RFC document in `.specify/rfcs/`
2. Team discussion and consensus
3. Update to this document
4. Update to enforcement mechanisms

---

**Last Updated**: 2026-03-08
**Version**: 1.0
**Next Review**: 2026-06-08