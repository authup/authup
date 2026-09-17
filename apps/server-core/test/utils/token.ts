/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { Client } from '@authup/core-http-kit';
import { OAuth2TokenKind } from '@authup/specs';
import { OAuth2InjectionToken } from '../../src/app/modules/oauth2/constants';
import type { TestHTTPApplication } from '../app';

/**
 * A client bearing the admin's own access token re-signed with `scope`, which
 * by default withholds `global`, so every identity-reading policy is answered
 * as it is for a scope-restricted bearer. `payload` names the subject.
 */
export async function createScopeRestrictedClient(suite: TestHTTPApplication, scope = 'openid') {
    const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
    const payload = await suite.client.token.introspect(
        { token: grant.access_token },
        { authorizationHeaderInherit: true },
    );

    const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
    const token = await signer.sign({
        jti: randomUUID(),
        sub: payload.sub,
        sub_kind: payload.sub_kind,
        realm_id: payload.realm_id,
        client_id: payload.client_id,
        session_id: payload.session_id,
        iat: payload.iat,
        exp: payload.exp,
        scope,
        kind: OAuth2TokenKind.ACCESS,
    });

    const client = new Client({ baseURL: suite.baseURL });
    client.setAuthorizationHeader({ type: 'Bearer', token });

    return { client, payload };
}
