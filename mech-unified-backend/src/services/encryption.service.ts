import * as crypto from 'crypto';
import { logger } from '../utils/logger';

export class EncryptionService {
  private static algorithm = 'aes-256-gcm';
  private static keyLength = 32; // 256 bits
  private static ivLength = 16; // 128 bits
  private static tagLength = 16; // 128 bits
  private static saltLength = 32; // 256 bits
  
  /**
   * Get or generate encryption key based on environment
   */
  private static getEncryptionKey(): Buffer {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    
    if (!masterKey) {
      logger.warn('ENCRYPTION_MASTER_KEY not set, using default key (NOT SECURE FOR PRODUCTION)');
      // In production, this should throw an error
      return crypto.scryptSync('default-insecure-key', 'salt', this.keyLength);
    }
    
    // Derive a key from the master key
    return crypto.scryptSync(masterKey, 'mech-db-creds', this.keyLength);
  }
  
  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);
      
      // Derive a unique key for this encryption
      const derivedKey = crypto.scryptSync(key, salt, this.keyLength);
      
      const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
      ]);
      
      const tag = (cipher as any).getAuthTag();
      
      // Combine salt, iv, tag, and encrypted data
      const combined = Buffer.concat([salt, iv, tag, encrypted]);
      
      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const tag = combined.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.saltLength + this.ivLength + this.tagLength);
      
      // Derive the key using the same salt
      const derivedKey = crypto.scryptSync(key, salt, this.keyLength);
      
      const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv);
      (decipher as any).setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Hash data for comparison (one-way)
   */
  static hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }
  
  /**
   * Generate a secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto
      .randomBytes(length)
      .toString('hex');
  }
}