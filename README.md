# JWT Wallet for NestJS with Kubernetes Integration

[![Version](https://img.shields.io/npm/v/jwtwallet-k8s-nestjs.svg)](https://www.npmjs.com/package/jwtwallet-k8s-nestjs)
[![License](https://img.shields.io/github/license/jwkwallet/jwtwallet-k8s-nestjs.svg)](https://github.com/jwkwallet/jwtwallet-k8s-nestjs/blob/main/LICENSE)

A secure NestJS library for JWT key lifecycle management in Kubernetes environments. This library provides automatic JWT key generation, rotation, and secure storage through Kubernetes Custom Resource Definitions (CRDs).

## Features

- 🔐 **Automatic JWT Key Management**: Generate and rotate JWT keys automatically
- 🔄 **Key Rotation**: Configurable automatic key rotation with expiration handling
- ☸️ **Kubernetes Integration**: Store keys securely as Kubernetes custom resources
- 🛡️ **Security First**: Secure defaults and best practices for JWT operations
- 📦 **NestJS Module**: Easy integration with existing NestJS applications
- 🚀 **Production Ready**: Designed for distributed, cloud-native applications

## Installation

```bash
npm install jwtwallet-k8s-nestjs
# or
yarn add jwtwallet-k8s-nestjs
```

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { JWTWalletModule } from 'jwtwallet-k8s-nestjs';

@Module({
  imports: [
    JWTWalletModule.register({
      issuer: 'your-app-issuer',
      namespace: 'your-k8s-namespace', // optional, defaults to 'default'
      keyExpirationSeconds: 24 * 60 * 60, // 24 hours
      keyRotationIntervalSeconds: 12 * 60 * 60, // 12 hours
      algorithm: 'ES256' // optional
    })
  ],
})
export class AppModule {}
```

### 2. Use the Service

```typescript
import { Injectable } from '@nestjs/common';
import { JWTWalletService } from 'jwtwallet-k8s-nestjs';

@Injectable()
export class AuthService {
  constructor(private readonly jwtWallet: JWTWalletService) {}

  async createToken(payload: any): Promise<string> {
    return this.jwtWallet.signJWT(payload);
  }

  async getJWKS(): Promise<any> {
    return this.jwtWallet.getJWKS();
  }
}
```

## Configuration

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `issuer` | `string` | Yes | - | FQDN of the JWT issuer |
| `namespace` | `string` | No | `'default'` | Kubernetes namespace for storing keys |
| `keyExpirationSeconds` | `number` | Yes | - | How long keys remain valid |
| `keyRotationIntervalSeconds` | `number` | Yes | - | How often to rotate keys |
| `algorithm` | `string` | No | `'ES256'` | JWT signing algorithm |

## Prerequisites

### Kubernetes Permissions

Your application needs the following Kubernetes RBAC permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: your-namespace
  name: jwtwallet-role
rules:
- apiGroups: ["apiextensions.k8s.io"]
  resources: ["customresourcedefinitions"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: ["your-crd-group"]  # Replace with actual CRD group
  resources: ["jwtkeys"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
```

### Custom Resource Definition

The library automatically manages JWT keys through Kubernetes CRDs. Ensure your cluster allows CRD creation or pre-install the required CRDs.

## Security Considerations

- 🔐 Private keys are never logged or exposed in error messages
- 🔄 Keys are automatically rotated to minimize exposure risk
- 🛡️ All cryptographic operations use secure, industry-standard algorithms
- 📝 Audit logs are generated for key lifecycle events

## Development

### Building

```bash
yarn install
yarn build
```

### Linting

```bash
yarn lint
```

### Type Checking

```bash
yarn typechecks
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following [Conventional Commits](https://conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

This library handles sensitive cryptographic operations. Please review our [Security Policy](SECURITY.md) before using in production environments.

For security vulnerabilities, please contact: [mehmet@appac.ltd](mailto:mehmet@appac.ltd)

## License

This project is licensed under the GPL-3.0-only License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://github.com/jwkwallet/jwtwallet-k8s-nestjs)
- 🐛 [Issue Tracker](https://github.com/jwkwallet/jwtwallet-k8s-nestjs/issues)
- 💬 [Discussions](https://github.com/jwkwallet/jwtwallet-k8s-nestjs/discussions)