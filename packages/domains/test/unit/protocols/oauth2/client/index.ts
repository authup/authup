/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useClient } from '@trapi/client';
import { HTTPOAuth2Client, Oauth2GrantParameters, Oauth2TokenResponse } from '../../../../../src';

const client = useClient('test');

const postFn = jest.fn();
client.post = postFn;

const getFn = jest.fn();
client.get = getFn;

const oauth2TokenResponse : Oauth2TokenResponse = {
    mac_key: 'mac_key',
    mac_algorithm: 'mac_algorithm',
    token_type: 'Bearer',
    expires_in: 3600,
    access_token: 'access_token',
    refresh_token: 'refresh_token',
    id_token: 'id_token',
};

const userInfoResponse : Record<string, any> = {
    name: 'admin',
    email: 'admin@example.com',
};

postFn.mockResolvedValue({ data: oauth2TokenResponse });
getFn.mockResolvedValue({ data: userInfoResponse });

const redirectUri = 'https://example.com/redirect';

describe('src/protocols/oauth2/client/index.ts', () => {
    it('should build authorize url', () => {
        // redirect uri in method
        let oauth2Client = new HTTPOAuth2Client({
            token_host: 'https://example.com/',
            client_id: 'client',
        });

        let url = oauth2Client.buildAuthorizeURL({
            redirect_uri: redirectUri,
        });

        expect(url).toEqual(`https://example.com/oauth/authorize?response_type=code&client_id=client&redirect_uri=${encodeURIComponent(redirectUri)}`);

        // redirect uri in constructor
        oauth2Client = new HTTPOAuth2Client({
            token_host: 'https://example.com/',
            client_id: 'client',
            redirect_uri: redirectUri,
        });

        url = oauth2Client.buildAuthorizeURL();

        expect(url).toEqual(`https://example.com/oauth/authorize?response_type=code&client_id=client&redirect_uri=${encodeURIComponent(redirectUri)}`);

        oauth2Client = new HTTPOAuth2Client({
            token_host: 'https://example.com/',
            client_id: 'client',
            redirect_uri: redirectUri,
            scope: ['email'],
        });

        url = oauth2Client.buildAuthorizeURL();

        expect(url).toEqual(`https://example.com/oauth/authorize?response_type=code&client_id=client&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email`);

        url = oauth2Client.buildAuthorizeURL({ scope: 'address' });

        expect(url).toEqual(`https://example.com/oauth/authorize?response_type=code&client_id=client&redirect_uri=${encodeURIComponent(redirectUri)}&scope=address`);
    });

    it('should build authorize url with non default authorize path', () => {
        const oauth2Client = new HTTPOAuth2Client({
            token_host: 'https://example.com/',
            client_id: 'client',
            authorize_path: 'authorize',
        });

        const url = oauth2Client.buildAuthorizeURL({
            redirect_uri: redirectUri,
        });

        expect(url).toEqual(`https://example.com/authorize?response_type=code&client_id=client&redirect_uri=${encodeURIComponent(redirectUri)}`);
    });

    it('should build token parameters', () => {
        const oauth2Client = new HTTPOAuth2Client({
            client_id: 'client',
            client_secret: 'secret',
            token_host: 'https://example.com/',
            redirect_uri: redirectUri,
            scope: ['email'],
        });

        let parameters : Oauth2GrantParameters = oauth2Client.buildTokenParameters({
            grant_type: 'password',
            username: 'admin',
            password: 'start123',
        });

        expect(parameters).toEqual({
            grant_type: 'password',
            username: 'admin',
            password: 'start123',
            client_id: 'client',
            scope: 'email',
            client_secret: 'secret',
        } as Oauth2GrantParameters);

        parameters = oauth2Client.buildTokenParameters({
            grant_type: 'authorization_code',
            code: 'code',
            state: 'state',
        });

        expect(parameters).toEqual({
            grant_type: 'authorization_code',
            code: 'code',
            state: 'state',
            client_id: 'client',
            redirect_uri: redirectUri,
            client_secret: 'secret',
        } as Oauth2GrantParameters);
    });

    it('should get token', async () => {
        const oauth2Client = new HTTPOAuth2Client({
            client_id: 'client',
            client_secret: 'secret',
            token_host: 'https://example.com/',
            redirect_uri: redirectUri,
            scope: ['email'],
        });

        let token = await oauth2Client.getTokenWithRefreshToken({ refresh_token: 'refresh_token' });
        expect(token).toEqual({ ...oauth2TokenResponse });

        token = await oauth2Client.getTokenWithClientCredentials({});
        expect(token).toEqual({ ...oauth2TokenResponse });

        token = await oauth2Client.getTokenWithPasswordGrant({ username: 'admin', password: 'start123' });
        expect(token).toEqual({ ...oauth2TokenResponse });

        token = await oauth2Client.getTokenWithAuthorizeGrant({ state: 'state', code: 'code' });
        expect(token).toEqual({ ...oauth2TokenResponse });
    });

    it('should get token with non default path', async () => {
        const oauth2Client = new HTTPOAuth2Client({
            client_id: 'client',
            client_secret: 'secret',
            token_host: 'https://example.com/',
            token_path: 'token',
            redirect_uri: redirectUri,
            scope: ['email'],
        });

        const token = await oauth2Client.getTokenWithPasswordGrant({ username: 'admin', password: 'start123' });
        expect(token).toEqual({ ...oauth2TokenResponse });
    });

    it('should get user info', async () => {
        const oauth2Client = new HTTPOAuth2Client({
            client_id: 'client',
            client_secret: 'secret',
            token_host: 'https://example.com/',
        });

        const userInfo = await oauth2Client.getUserInfo('token');
        expect(userInfo).toEqual(userInfoResponse);
    });

    it('should get user info with non default path', async () => {
        const oauth2Client = new HTTPOAuth2Client({
            client_id: 'client',
            client_secret: 'secret',
            token_host: 'https://example.com/',
            user_info_path: 'userinfo',
        });

        const userInfo = await oauth2Client.getUserInfo('token');
        expect(userInfo).toEqual(userInfoResponse);
    });
});
