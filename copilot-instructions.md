# GitHub Copilot Instructions for jwtwallet-k8s-nestjs

## Project Overview

This is a NestJS library that provides secure JWT wallet functionality with Kubernetes integration. It manages JWT keys automatically through Kubernetes custom resources, handling key generation, rotation, and secure storage for distributed applications.

## Architecture & Purpose

- **Primary Function**: JWT key lifecycle management in Kubernetes environments
- **Key Features**: Automatic key rotation, secure key storage, JWT signing capabilities
- **Target Use Case**: Distributed applications requiring secure JWT token generation and validation
- **Integration Pattern**: NestJS configurable module that can be imported into applications

## Technology Stack

### Core Technologies
- **NestJS**: Primary framework for dependency injection and modular architecture
- **TypeScript**: Strict typing with comprehensive ESLint rules
- **Kubernetes Client**: `@kubernetes/client-node` for CRD (Custom Resource Definition) management
- **JOSE Library**: `jose` package for JWT operations and cryptographic functions
- **Node.js**: Runtime environment (>=20.12.2)

### Development Tools
- **Package Manager**: Yarn 4.9.3 (using Corepack)
- **Linting**: ESLint with TypeScript rules and Prettier integration
- **Build**: TypeScript compiler (`tsc`)
- **Release**: Semantic-release with automated versioning

## Code Style & Conventions

### TypeScript Standards
- Use strict TypeScript configuration
- Always provide explicit return types for public methods
- Prefer interfaces over types for object shapes
- Use readonly arrays and objects where immutability is important
- Follow NestJS naming conventions: Services end with `Service`, Modules with `Module`

### Error Handling
- Create custom error classes in `jwtwallet.errors.ts`
- Prefer specific error types over generic Error class
- Always handle async operations with proper error catching
- Log errors appropriately using NestJS Logger

### NestJS Patterns
- Use `@Injectable()` decorator for all service classes
- Implement `OnModuleInit` for initialization logic
- Use configuration objects with proper typing (see `JWTWalletModuleModuleOptions`)
- Follow dependency injection patterns with proper constructor injection
- Use `@Inject()` decorator for custom tokens

## Security Considerations

### JWT Key Management
- Never log private keys or sensitive cryptographic material
- Use secure random generation for key IDs and cryptographic material
- Implement proper key rotation intervals
- Validate all JWT operations before performing cryptographic functions
- Handle key expiration gracefully

### Kubernetes Integration
- Validate all Kubernetes API responses
- Use proper RBAC permissions for custom resource operations
- Handle network failures and API timeouts gracefully
- Sanitize any data before storing in Kubernetes resources

## Configuration Patterns

### Module Configuration
```typescript
// Use this pattern for configurable modules
export interface JWTWalletModuleModuleOptions {
  issuer: string;
  namespace?: string;
  algorithm?: string;
  keyExpirationSeconds: number;
  keyRotationIntervalSeconds: number;
}
```

### Environment Variables
- Use the `@nestjs/config` package for configuration management
- Validate configuration objects at startup
- Provide sensible defaults for optional configuration
- Document all configuration options

## Testing Guidelines

### Test Structure
- Create unit tests for all service methods
- Mock Kubernetes client interactions
- Test error conditions and edge cases
- Validate JWT operations with known test vectors
- Use descriptive test names that explain the scenario

### Security Testing
- Test key rotation scenarios
- Validate proper error handling for invalid JWTs
- Test namespace isolation
- Verify proper cleanup of expired keys

## Dependencies & Integration

### Required Dependencies
- `@kubernetes/client-node`: Kubernetes API integration
- `@nestjs/common`: Core NestJS functionality
- `@nestjs/schedule`: For key rotation scheduling
- `jose`: JWT and cryptographic operations
- `uuid`: Unique identifier generation

### Development Dependencies
- ESLint with TypeScript support
- Prettier for code formatting
- TypeScript compiler and type definitions

## Common Patterns

### Async Operations
```typescript
// Always handle async operations properly
async rollKeys(): Promise<void> {
  try {
    // Implementation
  } catch (error) {
    this.logger.error(`Error during key rotation: ${error}`);
    throw error;
  }
}
```

### Kubernetes Resource Management
```typescript
// Use typed interfaces for Kubernetes operations
await this.kubeClient.createNamespacedCustomObject({
  group: JWTWalletService.GROUP,
  version: JWTWalletService.VERSION,
  namespace: this.namespace,
  plural: JWTWalletService.PLURAL,
  body: {
    apiVersion: `${JWTWalletService.GROUP}/${JWTWalletService.VERSION}`,
    kind: "JWTKey",
    metadata: { name: keypair.privateKeyKid },
    spec: { publicJwk, issuer: this.issuer }
  }
});
```

## Anti-Patterns to Avoid

- Don't use `console.log()` - use NestJS Logger instead
- Don't hardcode configuration values - use the configuration system
- Don't ignore async/await - always handle promises properly
- Don't expose private keys in logs or error messages
- Don't use global variables - rely on dependency injection
- Don't skip error handling for Kubernetes API calls

## Documentation Standards

- Use JSDoc comments for all public methods
- Document configuration options with examples
- Include security considerations in method documentation
- Provide usage examples in README files
- Document breaking changes in CHANGELOG.md

## Release & Versioning

- Follow semantic versioning (SemVer)
- Use conventional commits for automated changelog generation
- **PR titles must follow Conventional Commits format** (e.g., `feat: add feature`, `fix: resolve issue`)
- **PRs must reference issues**: All PRs (excluding dependabot updates) should reference which issue they are fixing by tagging `Fixes #<issue_number>` in the PR description
- Tag releases properly for npm publishing
- Update version in package.json through semantic-release
- Document breaking changes and migration paths

## Performance Considerations

- Cache Kubernetes client instances
- Implement proper cleanup for scheduled tasks
- Use efficient algorithms for key rotation
- Monitor memory usage for long-running processes
- Handle high-frequency JWT operations efficiently

## Debugging & Troubleshooting

- Use structured logging with appropriate log levels
- Include correlation IDs for tracing operations
- Log important state changes (key rotation, errors)
- Provide clear error messages with actionable information
- Use debug logs for detailed troubleshooting information