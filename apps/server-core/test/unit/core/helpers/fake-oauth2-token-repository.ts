/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { OAuth2TokenPayload } from '@authup/specs';
import { vi } from 'vitest';
import type { IOAuth2TokenRepository } from '../../../../src/core/oauth2/token/repository/types.ts';

export class FakeOAuth2TokenRepository implements IOAuth2TokenRepository {
    private inactiveIds = new Set<string>();

    private bySignature = new Map<string, OAuth2TokenPayload>();

    private byId = new Map<string, OAuth2TokenPayload>();

    public readonly setInactive = vi.fn(async (id: string) => {
        this.inactiveIds.add(id);
    });

    public readonly isInactive = vi.fn(async (id: string) => this.inactiveIds.has(id));

    public readonly findOneById = vi.fn(async (id: string) => this.byId.get(id) ?? null);

    public readonly findOneBySignature = vi.fn(async (token: string) => this.bySignature.get(token) ?? null);

    public readonly removeById = vi.fn(async (id: string) => {
        this.byId.delete(id);
    });

    public readonly insert = vi.fn(async (payload: OAuth2TokenPayload) => {
        const stored = { jti: randomUUID(), ...payload } as OAuth2TokenPayload;
        if (stored.jti) {
            this.byId.set(stored.jti, stored);
        }
        return stored;
    });

    public readonly save = vi.fn(async (payload: OAuth2TokenPayload) => {
        if (payload.jti) {
            this.byId.set(payload.jti, payload);
        }
        return payload;
    });

    public readonly saveWithSignature = vi.fn(async (payload: OAuth2TokenPayload, signature: string) => {
        this.bySignature.set(signature, payload);
        if (payload.jti) {
            this.byId.set(payload.jti, payload);
        }
        return payload;
    });

    seedSignature(signature: string, payload: OAuth2TokenPayload) {
        this.bySignature.set(signature, payload);
    }
}
