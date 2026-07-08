/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { OAuth2EndSessionRequestValidator } from '../../../../../src/core/oauth2/end-session/validator.ts';

describe('OAuth2EndSessionRequestValidator', () => {
    const validator = new OAuth2EndSessionRequestValidator();

    it('should pass through a valid request unchanged', async () => {
        const input = {
            id_token_hint: 'header.payload.signature',
            client_id: 'web',
            post_logout_redirect_uri: 'https://app.example.com/loggedout',
            state: 'abc123',
        };

        const output = await validator.run(input);

        expect(output.id_token_hint).toEqual(input.id_token_hint);
        expect(output.client_id).toEqual(input.client_id);
        expect(output.post_logout_redirect_uri).toEqual(input.post_logout_redirect_uri);
        expect(output.state).toEqual(input.state);
    });

    it('should canonicalize the realm hint (trim + lowercase)', async () => {
        const output = await validator.run({
            realm_id: '  MyRealm  ',
            realm_name: 'MASTER',
        });

        expect(output.realm_id).toEqual('myrealm');
        expect(output.realm_name).toEqual('master');
    });

    it('should treat blank params as absent', async () => {
        const output = await validator.run({
            id_token_hint: '',
            state: '   ',
            post_logout_redirect_uri: '',
        });

        expect(output.id_token_hint ?? undefined).toBeUndefined();
        expect(output.state ?? undefined).toBeUndefined();
        expect(output.post_logout_redirect_uri ?? undefined).toBeUndefined();
    });

    it('should reject an oversized id_token_hint', async () => {
        await expect(validator.run({ id_token_hint: 'x'.repeat(5000) })).rejects.toThrow();
    });

    it('should reject an oversized state', async () => {
        await expect(validator.run({ state: 'x'.repeat(3000) })).rejects.toThrow();
    });

    it('should reject a non-URL post_logout_redirect_uri', async () => {
        await expect(validator.run({ post_logout_redirect_uri: 'not a url' })).rejects.toThrow();
    });
});
