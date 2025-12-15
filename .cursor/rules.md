# Development Rules

These are the non-negotiable rules for this codebase.

## 🚫 What NOT to Do

### Handlers
- ❌ **NO business logic in handlers** - Only HTTP concerns
- ❌ **NO direct database calls** - Use repositories instead
- ❌ **NO complex validation logic** - Use ValidationUtils or move to libs/
- ❌ **NO response transformation logic** - Use mappers instead

### Repositories
- ❌ **NO HTTP status codes** - Throw errors, don't return status codes
- ❌ **NO request/response objects** - Work with entities and requests only
- ✅ **Direct AWS SDK calls are OK** - Repository handles DynamoDB directly

### General
- ❌ **NO any types** - Use proper TypeScript interfaces
- ❌ **NO console.log in production code** - Use proper logging
- ❌ **NO hardcoded values** - Use environment variables or constants

## ✅ What TO Do

### Handlers
- ✅ **Keep handlers thin** - Parse, validate, call repository, format response
- ✅ **Use repositories for business logic** - All database operations go through repositories
- ✅ **Use mappers for response transformation** - Keep mapping logic centralized
- ✅ **Handle errors consistently** - Use the response utility functions

### Repositories
- ✅ **Use static methods** - Repositories are stateless utility classes
- ✅ **Throw descriptive errors** - "Failed to create item" not just "Error"
- ✅ **Log errors with context** - Include relevant data in error logs
- ✅ **Return entities or null** - Don't return HTTP responses

### Code Organization
- ✅ **Follow the file structure** - Handlers in `handlers/`, business logic in `libs/`
- ✅ **Use TypeScript interfaces** - Define proper types for all data structures
- ✅ **Write tests** - Every new feature needs tests
- ✅ **Use consistent naming** - Follow the established conventions
- ✅ **Use ValidationUtils** - For common validation patterns

## 🎯 Quality Standards

### Code Quality
- **TypeScript strict mode** - No implicit any, strict null checks
- **ESLint compliance** - All code must pass linting
- **Test coverage** - Aim for 80%+ coverage on business logic
- **Error handling** - Every function should handle errors appropriately

### Performance
- **Efficient database queries** - Use appropriate indexes and query patterns
- **Minimal memory usage** - Don't load unnecessary data
- **Fast response times** - Keep handlers under 100ms when possible

### Security
- **Input validation** - Validate all inputs at the handler level
- **Error information** - Don't expose internal details in error messages
- **Authentication** - Use external authorizers for protected endpoints

## 📝 Documentation Requirements

### Code Documentation
- **JSDoc comments** - Document all public methods
- **Type definitions** - Document all interfaces and types
- **Error scenarios** - Document what errors can be thrown

### API Documentation
- **Request/response examples** - Include examples in comments
- **Error responses** - Document all possible error responses
- **Authentication requirements** - Document which endpoints require auth

## 🔄 Git Workflow

### Commit Messages
- **Use conventional commits** - `feat:`, `fix:`, `docs:`, etc.
- **Be descriptive** - Explain what and why, not just what
- **Keep commits focused** - One logical change per commit

### Pull Requests
- **Include tests** - New features must include tests
- **Update documentation** - Update relevant docs with changes
- **Pass all checks** - Tests, linting, and type checking must pass

## 🚀 Deployment Rules

### Environment Variables
- **Use .env files** - Never hardcode configuration
- **Validate required vars** - Check for required environment variables
- **Use appropriate defaults** - Provide sensible defaults where possible

### Infrastructure
- **Use SST resources** - Don't create AWS resources manually
- **Link resources properly** - Use SST's linking system
- **Handle errors gracefully** - Infrastructure should fail gracefully

## 🧪 Testing Rules

### Unit Tests
- **Test business logic** - Focus on repositories and utilities
- **Mock external dependencies** - Mock AWS SDK and external services
- **Test error scenarios** - Include tests for error conditions
- **Use descriptive test names** - Test names should explain the scenario

### Integration Tests
- **Test handler integration** - Test handlers with mocked repositories
- **Test error handling** - Ensure proper error responses
- **Test validation** - Ensure input validation works correctly

## 📊 Monitoring Rules

### Logging
- **Use structured logging** - Include relevant context in logs
- **Log errors with stack traces** - Include full error information
- **Don't log sensitive data** - Never log passwords, tokens, or PII

### Metrics
- **Track performance** - Monitor response times and error rates
- **Track usage** - Monitor API usage patterns
- **Set up alerts** - Alert on error rate increases or performance degradation
