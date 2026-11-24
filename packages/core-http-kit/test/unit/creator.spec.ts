/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import {
    OAuth2TokenAPI,
    createClientTokenCreator,
    createUserTokenCreator,
} from '../../src/index.ts';

const tokenGrantResponse : OAuth2TokenGrantResponse = {
    token_type: 'bearer',
    access_token: 'foo',
    refresh_token: 'bar',
    expires_in: 3600,
};

const createWithClientCredentials = vi.spyOn(OAuth2TokenAPI.prototype, 'createWithClientCredentials')
    .mockImplementation(() => Promise.resolve(tokenGrantResponse));

vi.spyOn(OAuth2TokenAPI.prototype, 'createWithPassword')
    .mockImplementation(() => Promise.resolve(tokenGrantResponse));

describe('src/creator', () => {
    it('should create token grant response with user', async () => {
        const creator = createUserTokenCreator({
            name: 'admin',
            password: 'start123',
            realmId: 'foo',
            realmName: 'bar',
        });

        expect(creator).toBeDefined();

        const output = await creator();

        expect(output).toEqual(tokenGrantResponse);
    });

    it('should create token grant response with client', async () => {
        const creator = createClientTokenCreator({
            id: 'system',
            secret: 'start123',
        });

        expect(creator).toBeDefined();

        const output = await creator();

        expect(output).toEqual(tokenGrantResponse);
    });

    it('should send the realm of a client', async () => {
        createWithClientCredentials.mockClear();

        await createClientTokenCreator({
            id: 'system',
            secret: 'start123',
            realmId: 'foo',
            realmName: 'bar',
        })();

        expect(createWithClientCredentials).toHaveBeenCalledWith({
            client_id: 'system',
            client_secret: 'start123',
            realm_id: 'foo',
            realm_name: 'bar',
        });
    });

    it('should send no realm of a client when none is given', async () => {
        createWithClientCredentials.mockClear();

        await createClientTokenCreator({ id: 'system', secret: 'start123' })();

        expect(createWithClientCredentials).toHaveBeenCalledWith({
            client_id: 'system',
            client_secret: 'start123',
        });
    });
});
