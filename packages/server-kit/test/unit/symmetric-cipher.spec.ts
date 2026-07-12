/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { SymmetricCipher } from '../../src';

const key = Buffer.alloc(32, 1).toString('base64');

describe('src/crypto/symmetric-cipher', () => {
    it('should encrypt and decrypt round-trip', async () => {
        const cipher = new SymmetricCipher(key);

        const blob = await cipher.encrypt('JBSWY3DPEHPK3PXP');
        expect(blob).not.toEqual('JBSWY3DPEHPK3PXP');

        const plain = await cipher.decrypt(blob);
        expect(plain).toEqual('JBSWY3DPEHPK3PXP');
    });

    it('should produce distinct blobs per encryption (fresh iv)', async () => {
        const cipher = new SymmetricCipher(key);

        const first = await cipher.encrypt('value');
        const second = await cipher.encrypt('value');
        expect(first).not.toEqual(second);

        expect(await cipher.decrypt(first)).toEqual('value');
        expect(await cipher.decrypt(second)).toEqual('value');
    });

    it('should reject a key of the wrong length', async () => {
        const cipher = new SymmetricCipher(Buffer.alloc(16, 1).toString('base64'));

        await expect(cipher.encrypt('value')).rejects.toThrow(/32 bytes/);
    });

    it('should reject a blob sealed under a different key', async () => {
        const cipher = new SymmetricCipher(key);
        const other = new SymmetricCipher(Buffer.alloc(32, 2).toString('base64'));

        const blob = await cipher.encrypt('value');
        await expect(other.decrypt(blob)).rejects.toThrow();
    });

    it('should reject a malformed blob', async () => {
        const cipher = new SymmetricCipher(key);

        await expect(cipher.decrypt('aaaa')).rejects.toThrow(/malformed/);
    });
});
