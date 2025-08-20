import {
  BaseJwtWalletError,
  PrivateKeyMissingError,
  KeyMissingError,
  SaveTokenExitError,
  KeyIdDidNotMatchError,
  UndefinedAlgoritmError,
} from '../src/jwtwallet.errors';

describe('JWTWallet Errors', () => {
  describe('BaseJwtWalletError', () => {
    it('should create an error with the provided message', () => {
      const message = 'Test error message';
      const error = new BaseJwtWalletError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('BaseJwtWalletError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseJwtWalletError);
    });

    it('should inherit from Error correctly', () => {
      const error = new BaseJwtWalletError('Test');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof BaseJwtWalletError).toBe(true);
    });
  });

  describe('PrivateKeyMissingError', () => {
    it('should create error with correct message and name', () => {
      const error = new PrivateKeyMissingError();

      expect(error.message).toBe('Private key is missing');
      expect(error.name).toBe('PrivateKeyMissingError');
      expect(error).toBeInstanceOf(BaseJwtWalletError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('KeyMissingError', () => {
    it('should create error with correct message and name', () => {
      const error = new KeyMissingError();

      expect(error.message).toBe('Key is missing');
      expect(error.name).toBe('KeyMissingError');
      expect(error).toBeInstanceOf(BaseJwtWalletError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('SaveTokenExitError', () => {
    it('should create error with correct message and name', () => {
      const error = new SaveTokenExitError();

      expect(error.message).toBe('Exiting due to missing keys');
      expect(error.name).toBe('SaveTokenExitError');
      expect(error).toBeInstanceOf(BaseJwtWalletError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('KeyIdDidNotMatchError', () => {
    it('should create error with correct message and name', () => {
      const error = new KeyIdDidNotMatchError();

      expect(error.message).toBe('Key ID did not match');
      expect(error.name).toBe('KeyIdDidNotMatchError');
      expect(error).toBeInstanceOf(BaseJwtWalletError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('UndefinedAlgoritmError', () => {
    it('should create error with correct message and name', () => {
      const error = new UndefinedAlgoritmError();

      expect(error.message).toBe('Key ID did not match');
      expect(error.name).toBe('UndefinedAlgoritmError');
      expect(error).toBeInstanceOf(BaseJwtWalletError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Error inheritance chain', () => {
    const errors = [
      PrivateKeyMissingError,
      KeyMissingError,
      SaveTokenExitError,
      KeyIdDidNotMatchError,
      UndefinedAlgoritmError,
    ];

    errors.forEach((ErrorClass) => {
      it(`${ErrorClass.name} should properly inherit from BaseJwtWalletError and Error`, () => {
        const error = new ErrorClass();
        
        expect(error instanceof Error).toBe(true);
        expect(error instanceof BaseJwtWalletError).toBe(true);
        expect(error instanceof ErrorClass).toBe(true);
        expect(typeof error.name).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(error.name).toBe(ErrorClass.name);
      });
    });
  });
});