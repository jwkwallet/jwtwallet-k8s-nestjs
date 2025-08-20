import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { JWTWalletModule, JWTWalletService } from '../src/jwtwallet.module';
import { JWTWalletModuleModuleOptions } from '../src/jwtwallet.module-options.interface';

describe('JWTWalletModule', () => {
  let module: TestingModule;

  const testOptions: JWTWalletModuleModuleOptions = {
    issuer: 'test-issuer',
    namespace: 'test-namespace',
    algorithm: 'ES256',
    keyExpirationSeconds: 3600,
    keyRotationIntervalSeconds: 300,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ScheduleModule.forRoot(),
        JWTWalletModule.forRoot(testOptions),
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(JWTWalletModule).toBeDefined();
    });

    it('should create module with forRoot configuration', () => {
      expect(module).toBeDefined();
    });

    it('should provide JWTWalletService', () => {
      const service = module.get<JWTWalletService>(JWTWalletService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(JWTWalletService);
    });

    it('should configure service with provided options', () => {
      const service = module.get<JWTWalletService>(JWTWalletService);
      
      // Access private properties for testing
      expect((service as any).namespace).toBe(testOptions.namespace);
      expect((service as any).keyExpirationSeconds).toBe(testOptions.keyExpirationSeconds);
      expect((service as any).keyRotationIntervalSeconds).toBe(testOptions.keyRotationIntervalSeconds);
      expect((service as any).issuer).toBe(testOptions.issuer);
    });
  });

  describe('Module with minimal options', () => {
    it('should work with minimal required options', async () => {
      const minimalOptions = {
        issuer: 'minimal-issuer',
        keyExpirationSeconds: 1800,
        keyRotationIntervalSeconds: 150,
      };

      const minimalModule = await Test.createTestingModule({
        imports: [
          ScheduleModule.forRoot(),
          JWTWalletModule.forRoot(minimalOptions),
        ],
      }).compile();

      const service = minimalModule.get<JWTWalletService>(JWTWalletService);
      expect(service).toBeDefined();
      expect((service as any).issuer).toBe(minimalOptions.issuer);
      expect((service as any).namespace).toBe('default'); // Should use default

      await minimalModule.close();
    });
  });

  describe('Module with global option', () => {
    it('should support global module configuration by default', async () => {
      const globalModule = await Test.createTestingModule({
        imports: [
          ScheduleModule.forRoot(),
          JWTWalletModule.forRoot(testOptions),
        ],
      }).compile();

      const service = globalModule.get<JWTWalletService>(JWTWalletService);
      expect(service).toBeDefined();

      await globalModule.close();
    });
  });

  describe('Export verification', () => {
    it('should export JWTWalletService', () => {
      expect(JWTWalletService).toBeDefined();
      expect(typeof JWTWalletService).toBe('function');
    });

    it('should export JWTWalletModule', () => {
      expect(JWTWalletModule).toBeDefined();
      expect(typeof JWTWalletModule).toBe('function');
    });

    it('should export JWTWalletModuleModuleOptions type', () => {
      // This is a type-only export, so we just verify it can be used
      const options: JWTWalletModuleModuleOptions = {
        issuer: 'test',
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 300,
      };
      expect(options).toBeDefined();
    });
  });
});