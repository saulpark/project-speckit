# Project Constitution

> Establishes non-negotiable principles and development guidelines for this project.

## 🏛️ Governing Principles

### Spec-Driven Development
- **Specifications First**: All features begin with detailed specifications in `.specify/specs/`
- **Implementation Follows Specs**: Code implements specifications, not the other way around
- **Iterative Refinement**: Specifications evolve through clarification and feedback
- **Executable Documentation**: Specifications directly generate working implementations

### Technical Standards
- **TypeScript Strict Mode**: All code must be strictly typed
- **Test-Driven Development**: Minimum 80% test coverage required
- **Security-First**: All inputs validated, no hardcoded secrets
- **Layered Architecture**: Controllers → Services → Models → Utils

### Code Quality
- **No Console.log**: Use proper logging frameworks
- **Error Handling**: Comprehensive try/catch and async error handling
- **Documentation**: All public APIs must be documented
- **Performance**: API responses < 200ms for simple operations

### Development Process
- **Branch per Feature**: Each feature gets its own branch
- **Pre-commit Hooks**: Quality gates must pass before commits
- **Peer Review**: All code changes require review
- **CI/CD Pipeline**: Automated testing and deployment

## 🚫 Prohibited Practices

### Security
- Hardcoded secrets, API keys, or passwords
- Direct database access from controllers
- Unvalidated user inputs
- Production console.log statements

### Architecture
- Circular dependencies between modules
- Tight coupling between layers
- Synchronous file operations in request handlers
- Business logic in controllers

### Code Quality
- Use of `any` type in TypeScript
- Missing error handling for async operations
- Bypassing type safety with casting
- Dead code or commented-out blocks

## ✅ Required Practices

### Every Feature Must Have
- Specification document in `.specify/specs/<id>-<name>/spec.md`
- Implementation plan at `.specify/specs/<id>-<name>/plan.md`
- Task breakdown at `.specify/specs/<id>-<name>/tasks.md`
- Comprehensive tests with good coverage
- API documentation (OpenAPI/Swagger)

### Every Commit Must Pass
- TypeScript compilation without errors
- All automated tests
- Linting and formatting checks
- Security vulnerability scans
- Constitution compliance validation

### Every Pull Request Must Include
- Link to original specification
- Updated documentation (if applicable)
- Test coverage for new functionality
- Security review for sensitive changes

## 🎯 Success Metrics

### Code Quality
- Test coverage > 80%
- Build success rate > 95%
- Zero HIGH/CRITICAL security vulnerabilities
- API response times < 200ms

### Process Quality
- All features have specifications
- 100% of commits pass quality gates
- Documentation is current and accurate
- Team follows established patterns

## 🔄 Evolution

This constitution is a living document that evolves with the project:

### Amendment Process
1. Proposal via RFC in `.specify/rfcs/`
2. Team discussion and consensus
3. Update to this document
4. Update enforcement mechanisms
5. Team notification and training

### Regular Review
- Monthly constitution review
- Quarterly effectiveness assessment
- Annual major revision consideration
- Immediate updates for security/compliance

---

**Established**: 2026-03-08
**Last Reviewed**: 2026-03-11
**Next Review**: 2026-04-11
**Enforcement**: Pre-commit hooks + CI/CD + Manual review