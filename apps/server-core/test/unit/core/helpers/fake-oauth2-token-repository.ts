/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { OAuth2TokenPayload } from '@authup/specs';
import type { IOAuth2TokenRepository } from '../../../../src/core/oauth2/token/repository/types.ts';

export class FakeOAuth2TokenRepository implements IOAuth2TokenRepository {
    public setInactiveCalls: { id: string; exp?: number }[] = [];

    public isInactiveCalls: string[] = [];

    public findOneByIdCalls: string[] = [];

    public findOneBySignatureCalls: string[] = [];

    public removeByIdCalls: string[] = [];

    public insertCalls: OAuth2TokenPayload[] = [];

    public saveCalls: OAuth2TokenPayload[] = [];

    public saveWithSignatureCalls: { payload: OAuth2TokenPayload; signature: string }[] = [];

    private inactiveIds = new Set<string>();

    private bySignature = new Map<string, OAuth2TokenPayload>();

    private byId = new Map<string, OAuth2TokenPayload>();

    async setInactive(id: string, exp?: number): Promise<void> {
        this.setInactiveCalls.push({ id, exp });
        this.inactiveIds.add(id);
    }

    async isInactive(id: string): Promise<boolean> {
        this.isInactiveCalls.push(id);
        return this.inactiveIds.has(id);
    }

    async findOneById(id: string): Promise<OAuth2TokenPayload | null> {
        this.findOneByIdCalls.push(id);
        return this.byId.get(id) ?? null;
    }

    async findOneBySignature(token: string): Promise<OAuth2TokenPayload | null> {
        this.findOneBySignatureCalls.push(token);
        return this.bySignature.get(token) ?? null;
    }

    async removeById(id: string): Promise<void> {
        this.removeByIdCalls.push(id);
        this.byId.delete(id);
    }

    async insert(payload: OAuth2TokenPayload): Promise<OAuth2TokenPayload> {
        this.insertCalls.push(payload);
        const stored = { ...payload, jti: payload.jti ?? randomUUID() } as OAuth2TokenPayload;
        this.byId.set(stored.jti, stored);
        return stored;
    }

    async save(payload: OAuth2TokenPayload): Promise<OAuth2TokenPayload> {
        this.saveCalls.push(payload);
        if (payload.jti) {
            this.byId.set(payload.jti, payload);
        }
        return payload;
    }

    async saveWithSignature(payload: OAuth2TokenPayload, signature: string): Promise<OAuth2TokenPayload> {
        this.saveWithSignatureCalls.push({ payload, signature });
        this.bySignature.set(signature, payload);
        if (payload.jti) {
            this.byId.set(payload.jti, payload);
        }
        return payload;
    }

    seedSignature(signature: string, payload: OAuth2TokenPayload) {
        this.bySignature.set(signature, payload);
    }
}
