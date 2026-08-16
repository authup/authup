/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { describe, expect, it } from 'vitest';
import { ValidatorGroup } from '@authup/kit';
import { ClientValidator } from '../../../src';

describe('ClientValidator redirect patterns', () => {
    const validator = new ClientValidator();

    it('should accept http(s) and custom-scheme patterns', async () => {
        const output = await validator.run({
            redirectUri: 'https://*.example.com/**,myapp://cb',
            postLogoutRedirectUri: 'https://app.example.com/**',
        }, { group: ValidatorGroup.UPDATE });

        expect(output.redirectUri).toEqual('https://*.example.com/**,myapp://cb');
        expect(output.postLogoutRedirectUri).toEqual('https://app.example.com/**');
    });

    it.each([
        ['redirectUri'],
        ['postLogoutRedirectUri'],
    ])('should reject a %s pattern carrying userinfo', async (key) => {
        await expect(validator.run({ [key]: 'https://app.example.com/**,https://user:secret@app.example.com/**' }, { group: ValidatorGroup.UPDATE })).rejects.toThrow();
    });
});
