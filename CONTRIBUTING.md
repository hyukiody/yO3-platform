# Contributing to YO3 Platform

We welcome contributions from the community! This document provides guidelines for contributing to the YO3 Platform project.

## Code of Conduct

Please be respectful, inclusive, and constructive in all interactions. We are committed to providing a welcoming and inspiring community for all.

## Getting Started

### 1. Fork the Repository

```bash
git clone https://github.com/your-fork/yo3-platform.git
cd yo3-platform
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes

Follow these guidelines:

- **Coding Standards**: Follow existing code style (Java: Google Java Style, JavaScript: Airbnb ES6)
- **Commit Messages**: Use clear, descriptive messages (e.g., "feat: add user authentication")
- **Documentation**: Update docs for any new features
- **Tests**: Write tests for new functionality

### 4. Test Your Changes

```bash
# Run unit tests
mvn clean test

# Run integration tests
mvn verify

# Run frontend tests
cd frontend && npm test

# Test with Docker Compose
docker-compose -f docker-compose.orchestrator.yml up -d
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

1. Go to https://github.com/yo3-platform/yo3-platform
2. Click "New Pull Request"
3. Select your branch
4. Fill in the PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe testing approach

## Checklist
- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## Development Setup

### Java Services

```bash
# Build all services
mvn clean package -DskipTests

# Run specific service
mvn -pl data-core spring-boot:run
mvn -pl edge-node spring-boot:run

# Debug service
mvn -pl data-core spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=5005"
```

### Frontend

```bash
# Install dependencies
cd frontend
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Database

```bash
# Start databases only
docker-compose up -d yo3-identity-db yo3-stream-db yo3-sentinel-db

# Run migrations
./ops/migrations/run.sh

# View database
mysql -h localhost -u root -p

# View PostgreSQL
psql -h localhost -U postgres
```

## Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **style**: Formatting, missing semicolons, etc.
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build, dependencies, etc.

### Example

```
feat(auth): add OAuth2 support

Add OAuth2 authentication provider for social login.
Supports Google, GitHub, and Microsoft providers.

Closes #123
```

## Code Review Process

1. **Automated Checks**: GitHub Actions runs tests and linters
2. **Code Review**: Maintainers review code for quality and consistency
3. **Feedback**: Address requested changes or discussion
4. **Approval**: At least one approval required for merge
5. **Merge**: Branch merged to main after approval

## Documentation

When contributing, please update relevant documentation:

- **Code comments**: Explain complex logic
- **README.md**: Update if feature affects setup/usage
- **DOCUMENTATION.md**: Add detailed feature documentation
- **API documentation**: Use JavaDoc and JSDoc comments

### Documentation Standards

```java
/**
 * Brief description of the method.
 *
 * Longer description if needed, explaining the purpose,
 * behavior, and any important details.
 *
 * @param param1 Description of first parameter
 * @param param2 Description of second parameter
 * @return Description of return value
 * @throws ExceptionType Description of when thrown
 */
public void methodName(String param1, int param2) { }
```

## Testing Guidelines

### Unit Tests

```java
// Java
@Test
void testFeatureX() {
    // Arrange
    String input = "test";
    
    // Act
    String result = service.process(input);
    
    // Assert
    assertEquals("expected", result);
}
```

```javascript
// JavaScript
describe('FeatureX', () => {
  it('should process input correctly', () => {
    const input = 'test';
    const result = processInput(input);
    expect(result).toBe('expected');
  });
});
```

### Integration Tests

```java
@SpringBootTest
@IntegrationTest
class ServiceIntegrationTest {
    @Test
    void testEndToEndFlow() {
        // Test across multiple components
    }
}
```

## Performance Considerations

- Avoid N+1 queries (batch operations)
- Cache frequently accessed data
- Use connection pooling for databases
- Profile code before and after changes
- Keep bundle size minimal for frontend

## Security Guidelines

- Never commit secrets or credentials
- Validate all user input
- Use parameterized queries to prevent SQL injection
- Keep dependencies updated
- Follow OWASP security best practices

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Docker version, etc.)
- Error messages/logs
- Minimal reproducible example

### Feature Requests

Include:
- Clear description of desired feature
- Use cases and benefits
- Possible implementation approach
- Any mockups or examples

## Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Keep PRs reasonably sized (< 400 lines if possible)
- Include tests for new functionality
- Update documentation
- Ensure all CI checks pass
- Respond to reviews promptly

## Release Process

1. Update version numbers (MAJOR.MINOR.PATCH)
2. Update CHANGELOG with release notes
3. Create annotated git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions automatically builds and pushes Docker image
6. Create GitHub Release with notes

## Questions?

- **GitHub Issues**: For bugs and features
- **Discussions**: For questions and ideas
- **Email**: contact@example.com for security issues

## Recognition

Contributors will be recognized in:
- CHANGELOG
- GitHub contributors page
- Release notes

Thank you for contributing to YO3 Platform!
