export interface JWTWalletModuleModuleOptions {
  /**
   * FQDN of the issuer
   */
  issuer: string;
  /**
   * Uses the default namespace for the pod
   */
  namespace?: string;

  algorithm?: string;
  keyExpirationSeconds: number;
  keyRotationIntervalSeconds: number;
}
