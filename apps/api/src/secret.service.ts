import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class SecretService {
  private key() {
    const source =
      process.env.INTEGRATION_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      'development-only-change-me';

    return createHash('sha256').update(source).digest();
  }

  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(payload: string) {
    const [version, ivRaw, tagRaw, encryptedRaw] = String(payload || '').split('.');

    if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
      throw new Error('Segredo inválido');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key(),
      Buffer.from(ivRaw, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
