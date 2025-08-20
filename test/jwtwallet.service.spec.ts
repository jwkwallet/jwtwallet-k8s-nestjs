import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { KubeConfig } from "@kubernetes/client-node";
import * as jose from "jose";
import { v4 as uuidv4 } from "uuid";

import { JWTWalletService } from "../src/jwtwallet.service";
import { ConfigModuleBuilder } from "../src/jwtwallet.module-definition";
import { JWTWalletModuleModuleOptions } from "../src/jwtwallet.module-options.interface";
import {
  KeyIdDidNotMatchError,
  KeyMissingError,
  PrivateKeyMissingError
} from "../src/jwtwallet.errors";

describe("JWTWalletService", () => {
  let service: JWTWalletService;
  let module: TestingModule;
  let mockKubeClient: jest.Mocked<any>;
  let mockSchedulerRegistry: jest.Mocked<SchedulerRegistry>;
  let mockLogger: jest.Mocked<Logger>;
  let options: JWTWalletModuleModuleOptions;

  // Mock crypto keys
  const mockPrivateKey = {} as any;
  const mockPublicKey = {} as any;
  const mockKeyPair = {
    privateKey: mockPrivateKey,
    publicKey: mockPublicKey
  };

  const mockKeypair = {
    privateKey: mockPrivateKey,
    privateKeyAlgorithm: "ES256",
    privateKeyKid: "test-kid-123",
    publicKey: mockPublicKey
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock KubeConfig and CustomObjectsApi
    const mockKubeConfig = {
      loadFromDefault: jest.fn(),
      makeApiClient: jest.fn()
    };
    mockKubeClient = {
      createNamespacedCustomObject: jest.fn(),
      getNamespacedCustomObject: jest.fn()
    };

    (KubeConfig as jest.MockedClass<typeof KubeConfig>).mockImplementation(
      () => mockKubeConfig as unknown as KubeConfig
    );
    mockKubeConfig.makeApiClient.mockReturnValue(mockKubeClient);

    // Mock SchedulerRegistry
    mockSchedulerRegistry = {
      addInterval: jest.fn()
    } as any;

    // Default options
    options = {
      issuer: "test-issuer",
      namespace: "test-namespace",
      algorithm: "ES256",
      keyExpirationSeconds: 3600,
      keyRotationIntervalSeconds: 300
    };

    module = await Test.createTestingModule({
      providers: [
        JWTWalletService,
        {
          provide: ConfigModuleBuilder.MODULE_OPTIONS_TOKEN,
          useValue: options
        },
        {
          provide: SchedulerRegistry,
          useValue: mockSchedulerRegistry
        }
      ]
    }).compile();

    service = module.get<JWTWalletService>(JWTWalletService);

    // Mock the logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn()
    } as any;
    (service as any).logger = mockLogger;
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe("Constructor", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should initialize with provided options", () => {
      expect(service).toBeDefined();
      expect((service as any).namespace).toBe("test-namespace");
      expect((service as any).keyExpirationSeconds).toBe(3600);
      expect((service as any).keyRotationIntervalSeconds).toBe(300);
      expect((service as any).issuer).toBe("test-issuer");
    });

    it("should use default values when options are not provided", async () => {
      const optionsWithDefaults = {
        issuer: "test-issuer",
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 300
        // no namespace, no algorithm
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JWTWalletService,
          {
            provide: ConfigModuleBuilder.MODULE_OPTIONS_TOKEN,
            useValue: optionsWithDefaults
          },
          {
            provide: SchedulerRegistry,
            useValue: mockSchedulerRegistry
          }
        ]
      }).compile();

      const serviceWithDefaults =
        module.get<JWTWalletService>(JWTWalletService);

      expect((serviceWithDefaults as any).namespace).toBe("default");
      expect((serviceWithDefaults as any).issuer).toBe("test-issuer");

      await module.close();
    });

    it("should use default issuer when not provided", async () => {
      const optionsWithoutIssuer = {
        keyExpirationSeconds: 3600,
        keyRotationIntervalSeconds: 300
      } as JWTWalletModuleModuleOptions;

      const moduleWithoutIssuer: TestingModule = await Test.createTestingModule(
        {
          providers: [
            JWTWalletService,
            {
              provide: ConfigModuleBuilder.MODULE_OPTIONS_TOKEN,
              useValue: optionsWithoutIssuer
            },
            {
              provide: SchedulerRegistry,
              useValue: mockSchedulerRegistry
            }
          ]
        }
      ).compile();

      const serviceWithDefaults =
        moduleWithoutIssuer.get<JWTWalletService>(JWTWalletService);

      expect((serviceWithDefaults as any).issuer).toBe(
        "jwtwallet.default.issuer"
      );

      await moduleWithoutIssuer.close();
    });
  });

  describe("generateKeys", () => {
    beforeEach(() => {
      (jose.generateKeyPair as jest.Mock).mockResolvedValue(mockKeyPair);
      (uuidv4 as jest.Mock).mockReturnValue("test-kid-123");
    });

    it("should generate keys with default algorithm", async () => {
      const keys = await (service as any).generateKeys();

      expect(jose.generateKeyPair).toHaveBeenCalledWith("ES256", {
        extractable: true
      });
      expect(uuidv4).toHaveBeenCalled();
      expect(keys).toEqual(mockKeypair);
    });

    it("should generate keys with custom algorithm from options", async () => {
      (service as any).options.algorithm = "RS256";

      const keys = await (service as any).generateKeys();

      expect(jose.generateKeyPair).toHaveBeenCalledWith("RS256", {
        extractable: true
      });
      expect(keys.privateKeyAlgorithm).toBe("RS256");
    });

    it("should use default algorithm when options.algorithm is undefined", async () => {
      (service as any).options.algorithm = undefined;

      const keys = await (service as any).generateKeys();

      expect(jose.generateKeyPair).toHaveBeenCalledWith("ES256", {
        extractable: true
      });
      expect(keys.privateKeyAlgorithm).toBe("ES256");
    });
  });

  describe("saveKeys", () => {
    const mockPublicJwk = { kty: "EC", crv: "P-256", x: "test-x", y: "test-y" };

    beforeEach(() => {
      (jose.exportJWK as jest.Mock).mockResolvedValue(mockPublicJwk);
    });

    it("should save keys to Kubernetes successfully", async () => {
      mockKubeClient.createNamespacedCustomObject.mockResolvedValue({});
      const expiresOn = Date.now() + 3600000;

      await (service as any).saveKeys(mockKeypair, expiresOn);

      expect(jose.exportJWK).toHaveBeenCalledWith(mockKeypair.publicKey);
      expect(mockKubeClient.createNamespacedCustomObject).toHaveBeenCalledWith({
        group: JWTWalletService.GROUP,
        version: JWTWalletService.VERSION,
        namespace: "test-namespace",
        plural: JWTWalletService.PLURAL,
        body: {
          apiVersion: `${JWTWalletService.GROUP}/${JWTWalletService.VERSION}`,
          kind: "JWTKey",
          metadata: {
            name: mockKeypair.privateKeyKid,
            namespace: "test-namespace"
          },
          spec: {
            publicJwk: mockPublicJwk,
            issuer: "test-issuer",
            dateExpiresMicros: expiresOn
          }
        }
      });
    });

    it("should handle Kubernetes API errors", async () => {
      const kubernetesError = new Error("Kubernetes API error");
      mockKubeClient.createNamespacedCustomObject.mockRejectedValue(
        kubernetesError
      );
      const expiresOn = Date.now() + 3600000;

      await expect(
        (service as any).saveKeys(mockKeypair, expiresOn)
      ).rejects.toThrow(kubernetesError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error saving key to K8s: ${kubernetesError}`
      );
    });
  });

  describe("rollKeys", () => {
    beforeEach(() => {
      jest.spyOn(service as any, "generateKeys").mockResolvedValue(mockKeypair);
      jest.spyOn(service as any, "saveKeys").mockResolvedValue(undefined);
      jest.spyOn(Date, "now").mockReturnValue(1000000000);
    });

    it("should roll keys successfully", async () => {
      await (service as any).rollKeys();

      expect((service as any).generateKeys).toHaveBeenCalled();
      expect((service as any).activeKey).toEqual(mockKeypair);
      expect((service as any).saveKeys).toHaveBeenCalledWith(
        mockKeypair,
        1000000000 + 3600000
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Rolling keys in namespace: test-namespace"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Keys rolled successfully. New key ID: ${mockKeypair.privateKeyKid} in namespace: test-namespace`
      );
    });

    it("should handle saveKeys errors", async () => {
      const saveError = new Error("Save error");
      jest.spyOn(service as any, "saveKeys").mockRejectedValue(saveError);

      await expect((service as any).rollKeys()).rejects.toThrow(saveError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to save keys to K8s: ${saveError}`
      );
    });
  });

  describe("onModuleInit", () => {
    let setIntervalSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.spyOn(service as any, "rollKeys").mockResolvedValue(undefined);
      setIntervalSpy = jest
        .spyOn(global, "setInterval")
        .mockReturnValue(123 as any);
    });

    afterEach(() => {
      setIntervalSpy.mockRestore();
    });

    it("should initialize module successfully", async () => {
      await service.onModuleInit();

      expect((service as any).rollKeys).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "JWTWalletService initialized"
      );
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300000);
      expect(mockSchedulerRegistry.addInterval).toHaveBeenCalledWith(
        "jwtwallet-key-rotation",
        123
      );
    });

    it("should set up key rotation interval", async () => {
      await service.onModuleInit();

      // Get the callback function passed to setInterval
      const intervalCallback = setIntervalSpy.mock.calls[0][0];

      // Reset the mock to verify it's called again
      (service as any).rollKeys = jest.fn().mockResolvedValue(undefined);

      // Execute the interval callback
      await intervalCallback();

      expect((service as any).rollKeys).toHaveBeenCalled();
    });
  });

  describe("signToken", () => {
    const mockSignJWT = {
      setExpirationTime: jest.fn().mockReturnThis(),
      setIssuer: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setNotBefore: jest.fn().mockReturnThis(),
      setProtectedHeader: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue("signed-jwt-token")
    };

    beforeEach(() => {
      (jose.SignJWT as jest.Mock).mockImplementation(() => mockSignJWT);
    });

    it("should sign token successfully", async () => {
      (service as any).activeKey = mockKeypair;
      const payload = { sub: "1234567890", name: "John Doe" };
      const expiresOn = Date.now() + 3600000;

      const result = await service.signToken(payload, expiresOn);

      expect(jose.SignJWT).toHaveBeenCalledWith(payload);
      expect(mockSignJWT.setExpirationTime).toHaveBeenCalledWith(expiresOn);
      expect(mockSignJWT.setIssuer).toHaveBeenCalledWith("test-issuer");
      expect(mockSignJWT.setIssuedAt).toHaveBeenCalled();
      expect(mockSignJWT.setNotBefore).toHaveBeenCalledWith("0s");
      expect(mockSignJWT.setProtectedHeader).toHaveBeenCalledWith({
        alg: mockKeypair.privateKeyAlgorithm,
        kid: mockKeypair.privateKeyKid
      });
      expect(mockSignJWT.sign).toHaveBeenCalledWith(mockKeypair.privateKey);
      expect(result).toBe("signed-jwt-token");
    });

    it("should throw PrivateKeyMissingError when no active key", async () => {
      (service as any).activeKey = undefined;
      const payload = { sub: "1234567890" };
      const expiresOn = Date.now() + 3600000;

      await expect(service.signToken(payload, expiresOn)).rejects.toThrow(
        PrivateKeyMissingError
      );
      expect(mockLogger.error).toHaveBeenCalledWith("No private key provided");
    });
  });

  describe("getJwkByKid", () => {
    const mockPublicJwk = { kty: "EC", crv: "P-256", x: "test-x", y: "test-y" };
    const kid = "test-kid-123";

    beforeEach(() => {
      jest.spyOn(Date, "now").mockReturnValue(1000000000);
    });

    it("should return cached JWK if not expired", async () => {
      const cacheEntry = {
        publicJwk: mockPublicJwk,
        cacheExpiration: 1000000000 + 1000 // Not expired
      };
      service.keyCache.set(kid, cacheEntry);

      const result = await service.getJwkByKid(kid);

      expect(result).toBe(mockPublicJwk);
      expect(mockKubeClient.getNamespacedCustomObject).not.toHaveBeenCalled();
    });

    it("should fetch from Kubernetes if cache is expired", async () => {
      const expiredCacheEntry = {
        publicJwk: mockPublicJwk,
        cacheExpiration: 1000000000 - 1000 // Expired
      };
      service.keyCache.set(kid, expiredCacheEntry);

      const k8sResponse = {
        body: {
          spec: {
            publicJwk: mockPublicJwk
          }
        }
      };
      mockKubeClient.getNamespacedCustomObject.mockResolvedValue(k8sResponse);

      const result = await service.getJwkByKid(kid);

      expect(result).toBe(mockPublicJwk);
      expect(mockKubeClient.getNamespacedCustomObject).toHaveBeenCalledWith({
        group: JWTWalletService.GROUP,
        version: JWTWalletService.VERSION,
        namespace: "test-namespace",
        plural: JWTWalletService.PLURAL,
        name: kid
      });

      // Verify cache was updated
      const updatedCacheEntry = service.keyCache.get(kid);
      expect(updatedCacheEntry).toEqual({
        publicJwk: mockPublicJwk,
        cacheExpiration: 1000000000 + 3600000
      });
    });

    it("should fetch from Kubernetes if not in cache", async () => {
      const k8sResponse = {
        body: {
          spec: {
            publicJwk: mockPublicJwk
          }
        }
      };
      mockKubeClient.getNamespacedCustomObject.mockResolvedValue(k8sResponse);

      const result = await service.getJwkByKid(kid);

      expect(result).toBe(mockPublicJwk);
      expect(mockKubeClient.getNamespacedCustomObject).toHaveBeenCalledWith({
        group: JWTWalletService.GROUP,
        version: JWTWalletService.VERSION,
        namespace: "test-namespace",
        plural: JWTWalletService.PLURAL,
        name: kid
      });

      // Verify cache was set
      const cacheEntry = service.keyCache.get(kid);
      expect(cacheEntry).toEqual({
        publicJwk: mockPublicJwk,
        cacheExpiration: 1000000000 + 3600000
      });
    });

    it("should handle Kubernetes API errors", async () => {
      const k8sError = new Error("Not found");
      mockKubeClient.getNamespacedCustomObject.mockRejectedValue(k8sError);

      await expect(service.getJwkByKid(kid)).rejects.toThrow(k8sError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error fetching key from K8s for kid ${kid}: ${k8sError}`
      );
    });
  });

  describe("clearCache", () => {
    beforeEach(() => {
      jest.spyOn(Date, "now").mockReturnValue(1000000000);
    });

    it("should clear expired cache entries", () => {
      const validEntry = {
        publicJwk: { valid: true },
        cacheExpiration: 1000000000 + 1000 // Not expired
      };
      const expiredEntry = {
        publicJwk: { expired: true },
        cacheExpiration: 1000000000 - 1000 // Expired
      };

      service.keyCache.set("valid-kid", validEntry);
      service.keyCache.set("expired-kid", expiredEntry);

      service.clearCache();

      expect(service.keyCache.has("valid-kid")).toBe(true);
      expect(service.keyCache.has("expired-kid")).toBe(false);
    });

    it("should handle empty cache", () => {
      expect(() => service.clearCache()).not.toThrow();
    });

    it("should not clear non-expired entries", () => {
      const futureEntry = {
        publicJwk: { test: "data" },
        cacheExpiration: 1000000000 + 3600000 // Far in the future
      };

      service.keyCache.set("future-kid", futureEntry);

      service.clearCache();

      expect(service.keyCache.has("future-kid")).toBe(true);
    });
  });

  describe("verifyToken", () => {
    const mockToken =
      "eyJhbGciOiJFUzI1NiIsImtpZCI6InRlc3Qta2lkLTEyMyJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";
    const mockPayload = { sub: "1234567890" };
    const audience = "test-audience";
    const mockPublicJwk = { kty: "EC", crv: "P-256", x: "test-x", y: "test-y" };

    beforeEach(() => {
      (jose.jwtVerify as jest.Mock).mockImplementation(
        (token, keyFunction, _options) => {
          // Call the key function with a mock header
          return keyFunction({ kid: "test-kid-123" }).then((_key) => {
            return Promise.resolve({ payload: mockPayload });
          });
        }
      );
      (jose.importJWK as jest.Mock).mockResolvedValue(mockPublicKey);
    });

    it("should verify token using active key when kid matches", async () => {
      (service as any).activeKey = mockKeypair;

      const result = await service.verifyToken(mockToken, audience);

      expect(result).toEqual(mockPayload);
      expect(jose.jwtVerify).toHaveBeenCalledWith(
        mockToken,
        expect.any(Function),
        { audience }
      );
    });

    it("should verify token using JWK from cache/k8s when kid does not match active key", async () => {
      (service as any).activeKey = {
        ...mockKeypair,
        privateKeyKid: "different-kid"
      };
      jest.spyOn(service, "getJwkByKid").mockResolvedValue(mockPublicJwk);

      const result = await service.verifyToken(mockToken, audience);

      expect(result).toEqual(mockPayload);
      expect(service.getJwkByKid).toHaveBeenCalledWith("test-kid-123");
      expect(jose.importJWK).toHaveBeenCalledWith(mockPublicJwk);
    });

    it("should verify token when no active key exists", async () => {
      (service as any).activeKey = undefined;
      jest.spyOn(service, "getJwkByKid").mockResolvedValue(mockPublicJwk);

      const result = await service.verifyToken(mockToken, audience);

      expect(result).toEqual(mockPayload);
      expect(service.getJwkByKid).toHaveBeenCalledWith("test-kid-123");
      expect(jose.importJWK).toHaveBeenCalledWith(mockPublicJwk);
    });

    it("should throw KeyIdDidNotMatchError when no kid in header", async () => {
      (jose.jwtVerify as jest.Mock).mockImplementation((token, keyFunction) => {
        return keyFunction({}).catch((error) => {
          throw error;
        });
      });

      await expect(service.verifyToken(mockToken, audience)).rejects.toThrow(
        KeyIdDidNotMatchError
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "No key ID (kid) found in token header"
      );
    });

    it("should throw KeyMissingError when JWK is not found", async () => {
      (service as any).activeKey = {
        ...mockKeypair,
        privateKeyKid: "different-kid"
      };
      jest.spyOn(service, "getJwkByKid").mockResolvedValue(null);

      (jose.jwtVerify as jest.Mock).mockImplementation((token, keyFunction) => {
        return keyFunction({ kid: "test-kid-123" }).catch((error) => {
          throw error;
        });
      });

      await expect(service.verifyToken(mockToken, audience)).rejects.toThrow(
        KeyMissingError
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "No public key found for kid: test-kid-123"
      );
    });

    it("should handle getJwkByKid errors", async () => {
      (service as any).activeKey = {
        ...mockKeypair,
        privateKeyKid: "different-kid"
      };
      const jwkError = new Error("JWK fetch error");
      jest.spyOn(service, "getJwkByKid").mockRejectedValue(jwkError);

      (jose.jwtVerify as jest.Mock).mockImplementation((token, keyFunction) => {
        return keyFunction({ kid: "test-kid-123" }).catch((error) => {
          throw error;
        });
      });

      await expect(service.verifyToken(mockToken, audience)).rejects.toThrow(
        jwkError
      );
    });
  });

  describe("Static properties", () => {
    it("should have correct static properties", () => {
      expect(JWTWalletService.GROUP).toBe("jwtwallet.k8s.io");
      expect(JWTWalletService.VERSION).toBe("v1");
      expect(JWTWalletService.PLURAL).toBe("jwtkeys");
    });
  });

  describe("keyCache property", () => {
    it("should initialize with empty Map", () => {
      expect(service.keyCache).toBeInstanceOf(Map);
      expect(service.keyCache.size).toBe(0);
    });

    it("should allow setting and getting cache entries", () => {
      const entry = {
        publicJwk: { test: "data" },
        cacheExpiration: Date.now() + 3600000
      };

      service.keyCache.set("test-kid", entry);
      expect(service.keyCache.get("test-kid")).toBe(entry);
    });
  });
});
