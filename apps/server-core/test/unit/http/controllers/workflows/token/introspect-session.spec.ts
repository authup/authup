/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { User } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { OAuth2TokenKind } from '@authup/specs';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { TokenController } from '../../../../../../src/adapters/http/controllers/workflows/token/module.ts';
import type { TokenControllerContext } from '../../../../../../src/adapters/http/controllers/workflows/token/types.ts';
import { setRequestIdentity } from '../../../../../../src/adapters/http/request/helpers/identity.ts';
import { SessionManager } from '../../../../../../src/core/authentication/session/module.ts';
import { createFakeEvent } from '../../../../adapters/http/request/fake-event.ts';
import { FakeSessionRepository } from '../../../../core/entities/session/fake-repository.ts';
import {
    FakeIdentityPermissionProvider,
    FakeIdentityResolver,
    FakeOAuth2TokenVerifier,
} from '../../../../core/helpers/index.ts';

const NOW = Date.parse('2026-01-01T00:00:00.000Z');
const TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzdWJqZWN0In0.c2lnbmF0dXJl';

afterEach(() => {
    vi.restoreAllMocks();
});

describe.each([OAuth2TokenKind.ACCESS, OAuth2TokenKind.REFRESH])('introspection %s session validity', (kind) => {
    it.each([
        {
            state: 'expired',
            offset: -1,
            active: false,
        },
        {
            state: 'at the expiry boundary',
            offset: 0,
            active: true,
        },
        {
            state: 'current',
            offset: 1,
            active: true,
        },
        {
            state: 'missing',
            offset: 0,
            active: false,
        },
        {
            state: 'mismatched',
            offset: -1,
            active: false,
        },
        {
            state: 'null expiry',
            offset: 0,
            active: false,
        },
    ])('reports a valid token with a $state session as active=$active', async ({
        state,
        offset,
        active,
    }) => {
        vi.spyOn(Date, 'now').mockReturnValue(NOW);

        const user = {
            id: randomUUID(),
            realmId: randomUUID(),
            name: 'subject',
            active: true,
        } as User;
        const identity = { type: IdentityType.USER, data: user } as const;
        const repository = new FakeSessionRepository();
        const session = repository.seed({
            sub: state === 'mismatched' ? randomUUID() : user.id,
            subKind: IdentityType.USER,
            realmId: user.realmId,
            expiresAt: new Date(NOW + offset).toISOString(),
        });

        // Runtime nulls retain SessionManager.verify's semantics (null is the epoch).
        if (state === 'null expiry') {
            Reflect.set(session, 'expiresAt', null);
        }

        if (state === 'missing') {
            await repository.remove(session);
        }

        const verifier = new FakeOAuth2TokenVerifier();
        const payload = {
            jti: randomUUID(),
            sub: user.id,
            sub_kind: IdentityType.USER,
            realm_id: user.realmId,
            session_id: session.id,
            kind,
            exp: NOW / 1000 + 3600,
            scope: ScopeName.GLOBAL,
        };

        verifier.seed(TOKEN, payload);

        const resolver = new FakeIdentityResolver();

        resolver.setIdentity(identity);

        const permissions = new FakeIdentityPermissionProvider();
        const manager = new SessionManager({ repository, options: { maxAge: 3600 } });
        // Grant-only dependencies are unused by this controller method.
        const context: Partial<TokenControllerContext> = {
            tokenVerifier: verifier,
            identityResolver: resolver,
            identityPermissionProvider: permissions,
            sessionManager: manager,
        };
        const controller = new TokenController(context as TokenControllerContext);
        const event = createFakeEvent({ method: 'POST', body: { token: TOKEN } });

        setRequestIdentity(event, identity);

        const result = await controller.postIntrospect(event);

        expect(result.active).toBe(active);
        expect(result.sub).toBe(user.id);
        expect(result.kind).toBe(kind);
        expect(result.name).toBe(user.name);

        if (active) {
            expect(result.permissions).toEqual([]);
            expect(permissions.getForTokenCalls).toHaveLength(1);
        } else {
            expect(result.permissions).toBeUndefined();
            expect(permissions.getForTokenCalls).toHaveLength(0);
        }

        if (state === 'mismatched') {
            expect(await repository.findOneById(session.id)).toBe(session);
        }
    });
});
