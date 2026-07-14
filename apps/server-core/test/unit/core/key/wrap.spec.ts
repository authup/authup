/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isAuthupError } from '@authup/errors';
import { SymmetricCipher } from '@authup/server-kit';
import { describe, expect, it } from 'vitest';
import {
    WRAPPED_KEY_MATERIAL_PREFIX,
    isWrappedKeyMaterial,
    unwrapKeyMaterial,
    wrapKeyMaterial,
} from '../../../../src/core/key/index.ts';

const kek = new SymmetricCipher(Buffer.alloc(32, 1).toString('base64'));

describe('core/key/wrap', () => {
    it('round-trips key material through the KEK', async () => {
        const material = Buffer.alloc(32, 7).toString('base64');

        const wrapped = await wrapKeyMaterial(kek, material);
        expect(wrapped.startsWith(WRAPPED_KEY_MATERIAL_PREFIX)).toBeTruthy();
        expect(wrapped).not.toContain(material);
        expect(isWrappedKeyMaterial(wrapped)).toBeTruthy();

        const unwrapped = await unwrapKeyMaterial(kek, wrapped);
        expect(unwrapped).toEqual(material);
    });

    it('passes plaintext material through untouched (with and without a KEK)', async () => {
        const material = Buffer.alloc(32, 7).toString('base64');

        expect(isWrappedKeyMaterial(material)).toBeFalsy();
        expect(await unwrapKeyMaterial(null, material)).toEqual(material);
        expect(await unwrapKeyMaterial(kek, material)).toEqual(material);
    });

    it('fails loud when wrapped material meets no KEK', async () => {
        const wrapped = await wrapKeyMaterial(kek, 'material');

        expect.assertions(2);
        try {
            await unwrapKeyMaterial(null, wrapped);
        } catch (e) {
            expect(isAuthupError(e)).toBeTruthy();
            expect((e as Error).message).toMatch(/SECRETS_ENCRYPTION_KEY/);
        }
    });

    it('fails on a wrong KEK (GCM authentication)', async () => {
        const wrapped = await wrapKeyMaterial(kek, 'material');
        const other = new SymmetricCipher(Buffer.alloc(32, 2).toString('base64'));

        await expect(unwrapKeyMaterial(other, wrapped)).rejects.toThrow();
    });
});
