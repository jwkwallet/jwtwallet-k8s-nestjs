import { JWTWalletModuleModuleOptions } from '../src/jwtwallet.module-options.interface';

describe('JWTWalletModuleModuleOptions Interface', () => {
  describe('Required Properties', () => {
    it('should require issuer property', () => {
      const options: JWTWalletModuleModuleOptions = {
        issuer: 'test-issuer',
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 300,
      };

      expect(options.issuer).toBe('test-issuer');
    });

    it('should require keyExpirationSeconds property', () => {
      const options: JWTWalletModuleModuleOptions = {
        issuer: 'test-issuer',
        keyExpirationSeconds: 7200,
        keyRotationIntervalSeconds: 300,
      };

      expect(options.keyExpirationSeconds).toBe(7200);
    });

    it('should require keyRotationIntervalSeconds property', () => {
      const options: JWTWalletModuleModuleOptions = {
        issuer: 'test-issuer',
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 600,
      };

      expect(options.keyRotationIntervalSeconds).toBe(600);
    });
  });

  describe('Optional Properties', () => {
    it('should allow namespace as optional property', () => {
      const optionsWithNamespace: JWTWalletModuleModuleOptions = {
        issuer: 'test-issuer',
        namespace: 'custom-namespace',
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 300,
      };

      expect(optionsWithNamespace.namespace).toBe('custom-namespace');

      const optionsWithoutNamespace: JWTWalletModuleModuleOptions = {
        issuer: 'test-issuer',
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 300,
      };

      expect(optionsWithoutNamespace.namespace).toBeUndefined();
    });

    it('should allow algorithm as optional property', () => {
      const optionsWithAlgorithm: JWTWalletModuleModuleOptions = {
        issuer: 'test-issuer',
        algorithm: 'RS256',
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 300,
      };

      expect(optionsWithAlgorithm.algorithm).toBe('RS256');

      const optionsWithoutAlgorithm: JWTWalletModuleModuleOptions = {
        issuer: 'test-issuer',
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 300,
      };

      expect(optionsWithoutAlgorithm.algorithm).toBeUndefined();
    });
  });

  describe('Complete Configuration Examples', () => {
    it('should support minimal configuration', () => {
      const minimalConfig: JWTWalletModuleModuleOptions = {
        issuer: 'minimal-issuer',
        keyExpirationSeconds: 1800,
        keyRotationIntervalSeconds: 150,
      };

      expect(minimalConfig.issuer).toBeDefined();
      expect(minimalConfig.keyExpirationSeconds).toBeGreaterThan(0);
      expect(minimalConfig.keyRotationIntervalSeconds).toBeGreaterThan(0);
      expect(minimalConfig.namespace).toBeUndefined();
      expect(minimalConfig.algorithm).toBeUndefined();
    });

    it('should support complete configuration', () => {
      const completeConfig: JWTWalletModuleModuleOptions = {
        issuer: 'https://example.com/jwtwallet',
        namespace: 'production-namespace',
        algorithm: 'ES384',
        keyExpirationSeconds: 14400,
        keyRotationIntervalSeconds: 1200,
      };

      expect(completeConfig.issuer).toBe('https://example.com/jwtwallet');
      expect(completeConfig.namespace).toBe('production-namespace');
      expect(completeConfig.algorithm).toBe('ES384');
      expect(completeConfig.keyExpirationSeconds).toBe(14400);
      expect(completeConfig.keyRotationIntervalSeconds).toBe(1200);
    });

    it('should support various algorithm values', () => {
      const algorithms = ['ES256', 'ES384', 'ES512', 'RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512'];

      algorithms.forEach(algorithm => {
        const config: JWTWalletModuleModuleOptions = {
          issuer: 'test-issuer',
          algorithm,
          keyExpirationSeconds: 3600,
          keyRotationIntervalSeconds: 300,
        };

        expect(config.algorithm).toBe(algorithm);
      });
    });

    it('should support various time configurations', () => {
      const timeConfigs = [
        { keyExpirationSeconds: 300, keyRotationIntervalSeconds: 60 },      // 5 min expiry, 1 min rotation
        { keyExpirationSeconds: 3600, keyRotationIntervalSeconds: 300 },    // 1 hour expiry, 5 min rotation
        { keyExpirationSeconds: 86400, keyRotationIntervalSeconds: 3600 },  // 24 hour expiry, 1 hour rotation
        { keyExpirationSeconds: 604800, keyRotationIntervalSeconds: 86400 }, // 1 week expiry, 1 day rotation
      ];

      timeConfigs.forEach(({ keyExpirationSeconds, keyRotationIntervalSeconds }) => {
        const config: JWTWalletModuleModuleOptions = {
          issuer: 'test-issuer',
          keyExpirationSeconds,
          keyRotationIntervalSeconds,
        };

        expect(config.keyExpirationSeconds).toBe(keyExpirationSeconds);
        expect(config.keyRotationIntervalSeconds).toBe(keyRotationIntervalSeconds);
        expect(config.keyExpirationSeconds).toBeGreaterThanOrEqual(config.keyRotationIntervalSeconds);
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce required properties at compile time', () => {
      // This test ensures TypeScript compilation would fail if required properties are missing
      // The test itself validates the interface contract

      // Valid configuration
      const validConfig: JWTWalletModuleModuleOptions = {
        issuer: 'test-issuer',
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 300,
      };
      expect(validConfig).toBeDefined();

      // TypeScript would prevent these invalid configurations:
      // const invalidConfig1: JWTWalletModuleModuleOptions = {}; // Missing required props
      // const invalidConfig2: JWTWalletModuleModuleOptions = { issuer: 'test' }; // Missing other required props
    });

    it('should allow string values for issuer', () => {
      const configs = [
        'simple-issuer',
        'https://example.com/issuer',
        'urn:example:issuer',
        'issuer-with-dashes-and_underscores',
        'issuer.with.dots',
      ];

      configs.forEach(issuer => {
        const config: JWTWalletModuleModuleOptions = {
          issuer,
          keyExpirationSeconds: 3600,
          keyRotationIntervalSeconds: 300,
        };

        expect(config.issuer).toBe(issuer);
      });
    });

    it('should allow number values for time properties', () => {
      const config: JWTWalletModuleModuleOptions = {
        issuer: 'test-issuer',
        keyExpirationSeconds: Math.floor(Date.now() / 1000) + 3600,
        keyRotationIntervalSeconds: 300.5, // Should allow decimal numbers
      };

      expect(typeof config.keyExpirationSeconds).toBe('number');
      expect(typeof config.keyRotationIntervalSeconds).toBe('number');
    });
  });
});