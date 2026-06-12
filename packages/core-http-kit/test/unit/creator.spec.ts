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
    createRobotTokenCreator,
    createUserTokenCreator,
} from '../../src';

const tokenGrantResponse : OAuth2TokenGrantResponse = {
    token_type: 'bearer',
    access_token: 'foo',
    refresh_token: 'bar',
    expires_in: 3600,
};

vi.spyOn(OAuth2TokenAPI.prototype, 'createWithClientCredentials')
    .mockImplementation(() => Promise.resolve(tokenGrantResponse));

vi.spyOn(OAuth2TokenAPI.prototype, 'createWithRobotCredentials')
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

    it('should create token grant response with robot', async () => {
        const creator = createRobotTokenCreator({
            id: 'SYSTEM',
            secret: 'start123',
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
});
