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

    it.each([
        ['redirectUri'],
        ['postLogoutRedirectUri'],
    ])('should reject a %s pattern with a script-capable scheme', async (key) => {
        await expect(validator.run({ [key]: 'https://app.example.com/**,javascript:alert(document.cookie)//' }, { group: ValidatorGroup.UPDATE })).rejects.toThrow();
    });
});

describe('ClientValidator backchannelLogoutUri', () => {
    const validator = new ClientValidator();

    it('should accept one https endpoint', async () => {
        const output = await validator.run({ backchannelLogoutUri: 'https://app.example.com/logout' }, { group: ValidatorGroup.UPDATE });

        expect(output.backchannelLogoutUri).toEqual('https://app.example.com/logout');
    });

    it('should accept a query string carrying a comma (a single URL is never split)', async () => {
        const value = 'https://app.example.com/logout?tenants=a,b';
        const output = await validator.run({ backchannelLogoutUri: value }, { group: ValidatorGroup.UPDATE });

        expect(output.backchannelLogoutUri).toEqual(value);
    });

    it('should accept null (no push)', async () => {
        const output = await validator.run({ backchannelLogoutUri: null }, { group: ValidatorGroup.UPDATE });

        expect(output.backchannelLogoutUri).toBeNull();
    });

    it('should accept a value at the column length (2000)', async () => {
        const value = 'https://app.example.com/'.padEnd(2000, 'a');
        const output = await validator.run({ backchannelLogoutUri: value }, { group: ValidatorGroup.UPDATE });

        expect(output.backchannelLogoutUri).toEqual(value);
    });

    it.each([
        ['a wildcard', 'https://*.example.com/logout'],
        // the column is varchar(2000); the driver would reject this as a 500
        ['a value longer than the column (2000)', `https://app.example.com/${'a'.repeat(2000)}`],
        // a pasted pattern list parses as ONE URL with the comma in its path
        ['a comma separated list', 'https://app.example.com/logout,https://alt.example.com/logout'],
        ['userinfo', 'https://user:secret@app.example.com/logout'],
        ['a custom scheme', 'myapp://logout'],
        // eslint-disable-next-line no-script-url -- the scheme under test
        ['a script-capable scheme', 'javascript:alert(document.cookie)//'],
    ])('should reject %s', async (_label, value) => {
        await expect(validator.run({ backchannelLogoutUri: value }, { group: ValidatorGroup.UPDATE })).rejects.toThrow();
    });
});
