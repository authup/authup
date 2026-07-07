/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2AuthorizationCodeRequestValidator } from '../../../../../../src/core/oauth2/authorization/code-request/validator.ts';

describe('OAuth2AuthorizationCodeRequestValidator', () => {
    let validator: OAuth2AuthorizationCodeRequestValidator;

    const base = {
        response_type: 'code',
        redirect_uri: 'https://example.com/callback',
        scope: 'global openid',
        client_id: 'web',
    };

    beforeEach(() => {
        validator = new OAuth2AuthorizationCodeRequestValidator();
    });

    it('should accept prompt=select_account', async () => {
        const output = await validator.run({ ...base, prompt: 'select_account' });
        expect(output.prompt).toEqual('select_account');
    });

    it('should ignore unknown prompt tokens', async () => {
        const output = await validator.run({ ...base, prompt: 'select_account unknown_value' });
        expect(output.prompt).toEqual('select_account unknown_value');
    });

    it('should reject prompt=none combined with other values', async () => {
        await expect(
            validator.run({ ...base, prompt: 'none login' }),
        ).rejects.toThrow();
    });

    it('should coerce max_age to a number', async () => {
        const output = await validator.run({ ...base, max_age: '60' });
        expect(output.max_age).toEqual(60);
    });

    it('should canonicalize login_hint (trim + lowercase)', async () => {
        const output = await validator.run({ ...base, login_hint: '  Alice@Corp  ' });
        expect(output.login_hint).toEqual('alice@corp');
    });

    it('should pass a request without any prompt fields', async () => {
        const output = await validator.run({ ...base });
        expect(output.prompt).toBeUndefined();
        expect(output.max_age).toBeUndefined();
        expect(output.login_hint).toBeUndefined();
    });
});
