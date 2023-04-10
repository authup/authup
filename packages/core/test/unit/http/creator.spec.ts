/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyValueV1API } from '@hapic/vault';
import type { TokenGrantResponse } from '@hapic/oauth2';
import { TokenAPI } from '@hapic/oauth2';
import { RobotAPI, createTokenCreator } from '../../../src';

const tokenGrantResponse : TokenGrantResponse = {
    token_type: 'bearer',
    access_token: 'foo',
    refresh_token: 'bar',
    expires_in: 3600,
};

jest.spyOn(TokenAPI.prototype, 'createWithRobotCredentials')
    .mockImplementation(() => Promise.resolve(tokenGrantResponse));

jest.spyOn(TokenAPI.prototype, 'createWithPasswordGrant')
    .mockImplementation(() => Promise.resolve(tokenGrantResponse));

jest.spyOn(KeyValueV1API.prototype, 'getOne')
    .mockImplementation((context) => {
        if (context.path === 'SYSTEM') {
            return Promise.resolve({
                data: {
                    id: 'foo',
                    secret: 'bar',
                },
            });
        }

        return Promise.resolve(undefined);
    });

jest.spyOn(RobotAPI.prototype, 'integrity')
    .mockReturnValue(Promise.resolve(undefined));

describe('src/creator', () => {
    it('should create token grant response with user', async () => {
        const creator = createTokenCreator({
            type: 'user',
            baseUrl: 'http://localhot:3001',
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
        const creator = createTokenCreator({
            type: 'robot',
            baseUrl: 'http://localhot:3001',
            id: 'SYSTEM',
            secret: 'start123',
        });

        expect(creator).toBeDefined();

        const output = await creator();
        expect(output).toEqual(tokenGrantResponse);
    });

    it('should create and use robot vault authenticator', async () => {
        const creator = createTokenCreator({
            type: 'robotInVault',
            baseUrl: 'http://localhot:3001',
            name: 'SYSTEM',
            vault: 'admin:start123@http://127.0.0.1:8098/v1/',
        });

        expect(creator).toBeDefined();

        const output = await creator();
        expect(output).toEqual(tokenGrantResponse);
    });
});
