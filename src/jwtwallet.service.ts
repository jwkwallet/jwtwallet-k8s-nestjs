import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigModuleBuilder } from "./jwtwallet.module-definition";
import { JWTWalletModuleModuleOptions } from "./jwtwallet.module-options.interface";

import { CustomObjectsApi, KubeConfig } from "@kubernetes/client-node";
import { ObjectCustomObjectsApi } from "@kubernetes/client-node/dist/gen/types/ObjectParamAPI";
import { Interval, SchedulerRegistry } from "@nestjs/schedule";
import type { webcrypto } from "crypto";
import * as jose from "jose";
import { v4 } from "uuid";
import {
  KeyIdDidNotMatchError,
  KeyMissingError,
  PrivateKeyMissingError
} from "./jwtwallet.errors";

const DEFAULT_ALGORITHM_FOR_DEVELOPMENT = "ES256";

interface Keypair {
  privateKey: webcrypto.CryptoKey;
  privateKeyAlgorithm: string;
  privateKeyKid: string;
  publicKey: webcrypto.CryptoKey;
}

@Injectable()
export class JWTWalletService implements OnModuleInit {
  static readonly GROUP = "jwtwallet.k8s.io";
  static readonly VERSION = "v1";
  static readonly PLURAL = "jwtkeys";

  private logger = new Logger(JWTWalletService.name);

  private activeKey?: Keypair;

  private issuer: string;
  private namespace: string;
  private kubeClient: ObjectCustomObjectsApi;
  private keyExpirationSeconds: number;
  private keyRotationIntervalSeconds: number;

  constructor(
    @Inject(ConfigModuleBuilder.MODULE_OPTIONS_TOKEN)
    private readonly options: JWTWalletModuleModuleOptions,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {
    const kc = new KubeConfig();
    kc.loadFromDefault();
    this.kubeClient = kc.makeApiClient(CustomObjectsApi);
    this.namespace = options.namespace ?? "default";
    this.keyExpirationSeconds = options.keyExpirationSeconds;
    this.keyRotationIntervalSeconds = options.keyRotationIntervalSeconds;
    this.issuer = options.issuer ?? "jwtwallet.default.issuer";
  }

  async onModuleInit() {
    await this.rollKeys();
    this.logger.log("JWTWalletService initialized");

    const interval = setInterval(async () => {
      await this.rollKeys();
    }, this.keyRotationIntervalSeconds * 1000);

    this.schedulerRegistry.addInterval("jwtwallet-key-rotation", interval);
  }

  private async rollKeys() {
    this.logger.log(`Rolling keys in namespace: ${this.namespace}`);
    const keypair = await this.generateKeys();

    this.activeKey = keypair;

    const expiresOn = Date.now() + this.keyExpirationSeconds * 1000;

    try {
      await this.saveKeys(keypair, expiresOn);
      this.logger.log(
        `Keys rolled successfully. New key ID: ${keypair.privateKeyKid} in namespace: ${this.namespace}`
      );
    } catch (err) {
      this.logger.error(`Failed to save keys to K8s: ${err}`);
      throw err;
    }
  }

  private async saveKeys(keypair: Keypair, expiresOn: number) {
    const publicJwk = await jose.exportJWK(keypair.publicKey);
    const expiresOnMicros = expiresOn;
    try {
      await this.kubeClient.createNamespacedCustomObject({
        group: JWTWalletService.GROUP,
        version: JWTWalletService.VERSION,
        namespace: this.namespace,
        plural: JWTWalletService.PLURAL,
        body: {
          apiVersion: `${JWTWalletService.GROUP}/${JWTWalletService.VERSION}`,
          kind: "JWTKey",
          metadata: {
            name: keypair.privateKeyKid,
            namespace: this.namespace
          },
          spec: {
            publicJwk,
            issuer: this.issuer,
            dateExpiresMicros: expiresOnMicros
          }
        }
      });
    } catch (err) {
      this.logger.error(`Error saving key to K8s: ${err}`);
      throw err;
    }
  }

  private async generateKeys(): Promise<Keypair> {
    const algorithm =
      this.options.algorithm ?? DEFAULT_ALGORITHM_FOR_DEVELOPMENT;
    const keys = await jose.generateKeyPair(algorithm, { extractable: true });

    const kid = v4();

    return {
      privateKey: keys.privateKey,
      privateKeyAlgorithm: algorithm,
      privateKeyKid: kid,
      publicKey: keys.publicKey
    };
  }

  public async signToken(object: jose.JWTPayload, expiresOn: number) {
    if (this.activeKey === undefined) {
      this.logger.error("No private key provided");
      throw new PrivateKeyMissingError();
    }

    const rootJwt = await new jose.SignJWT(object)
      .setExpirationTime(expiresOn)
      .setIssuer(this.issuer)
      .setIssuedAt()
      .setNotBefore("0s")
      .setProtectedHeader({
        alg: this.activeKey.privateKeyAlgorithm,
        kid: this.activeKey.privateKeyKid
      })
      .sign(this.activeKey.privateKey);

    return rootJwt;
  }

  keyCache: Map<
    string,
    {
      publicJwk: Record<string, unknown>;
      cacheExpiration: number;
    }
  > = new Map();

  async getJwkByKid(kid: string) {
    const cachedJwk = this.keyCache.get(kid);
    if (cachedJwk && cachedJwk.cacheExpiration > Date.now()) {
      return cachedJwk.publicJwk;
    }

    try {
      const obj = await this.kubeClient.getNamespacedCustomObject({
        group: JWTWalletService.GROUP,
        version: JWTWalletService.VERSION,
        namespace: this.namespace,
        plural: JWTWalletService.PLURAL,
        name: kid
      });

      this.keyCache.set(kid, {
        publicJwk: obj.body.spec.publicJwk,
        cacheExpiration: Date.now() + this.keyExpirationSeconds * 1000
      });

      return obj.body.spec.publicJwk;
    } catch (err) {
      this.logger.error(`Error fetching key from K8s for kid ${kid}: ${err}`);
      throw err;
    }
  }

  @Interval(10000)
  clearCache() {
    this.keyCache.forEach((value, key) => {
      if (value.cacheExpiration < Date.now()) {
        this.keyCache.delete(key);
      }
    });
  }

  public async verifyToken(token: string, audience: string) {
    const { payload } = await jose.jwtVerify(
      token,
      async (header) => {
        const kid = header.kid;
        if (!kid) {
          this.logger.error("No key ID (kid) found in token header");
          throw new KeyIdDidNotMatchError();
        }

        if (this.activeKey && this.activeKey.privateKeyKid === kid) {
          // Early return if we have the active key
          return this.activeKey.publicKey;
        }

        const publicJwk = await this.getJwkByKid(kid);
        if (!publicJwk) {
          this.logger.error(`No public key found for kid: ${kid}`);
          throw new KeyMissingError();
        }

        // Convert JWK to KeyLike for jose
        return await jose.importJWK(publicJwk);
      },
      {
        audience
      }
    );

    return payload;
  }
}
