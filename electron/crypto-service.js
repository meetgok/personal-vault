import crypto from 'crypto';

const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const ALGORITHM = 'aes-256-gcm';

export function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

export function encrypt(text, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag
    };
}

export function decrypt(encryptedData, key, iv, authTag) {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

export function generateSalt() {
    return crypto.randomBytes(32).toString('hex');
}

export function hashForCheck(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}
