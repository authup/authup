/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IOAuth2DeviceCodeRepository,
    OAuth2DeviceCode,
    OAuth2DeviceCodeDecision,
    OAuth2DeviceCodeRequest,
} from '../../../../src/core/index.ts';
import { OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW, OAuth2DeviceCodeStatus } from '../../../../src/core/index.ts';

export class FakeOAuth2DeviceCodeRepository implements IOAuth2DeviceCodeRepository {
    public saveCalls: OAuth2DeviceCodeRequest[] = [];

    public findOneByIdCalls: string[] = [];

    public findOneByUserCodeCalls: string[] = [];

    public popOneByIdCalls: string[] = [];

    public removeByIdCalls: string[] = [];

    public decideCalls: {
        id: string, 
        decision: OAuth2DeviceCodeDecision, 
        expiresAt: number 
    }[] = [];

    public removeUserCodeCalls: string[] = [];

    public touchPollCalls: string[] = [];

    public lookupThrottleCalls: string[] = [];

    public countLookupMissCalls: { key: string, limit: number }[] = [];

    private requests = new Map<string, OAuth2DeviceCodeRequest>();

    private userCodes = new Map<string, string>();

    private decisions = new Map<string, OAuth2DeviceCodeDecision>();

    private polls = new Map<string, number>();

    private attempts = new Map<string, number>();

    private locks = new Map<string, number>();

    seed(request: OAuth2DeviceCodeRequest): OAuth2DeviceCodeRequest {
        this.requests.set(request.id, request);
        this.userCodes.set(request.user_code, request.id);
        return request;
    }

    has(id: string): boolean {
        return this.requests.has(id);
    }

    hasPoll(id: string): boolean {
        return this.polls.has(id);
    }

    dropPoll(id: string): void {
        this.polls.delete(id);
    }

    async save(entity: OAuth2DeviceCodeRequest): Promise<boolean> {
        this.saveCalls.push(entity);

        if (entity.expires_at <= Math.floor(Date.now() / 1000)) {
            return false;
        }

        if (this.userCodes.has(entity.user_code)) {
            return false;
        }

        this.userCodes.set(entity.user_code, entity.id);
        this.requests.set(entity.id, entity);

        return true;
    }

    async findOneById(id: string): Promise<OAuth2DeviceCode | null> {
        this.findOneByIdCalls.push(id);

        const request = this.requests.get(id);
        if (!request) {
            return null;
        }

        return this.merge(request);
    }

    async findOneByUserCode(userCode: string): Promise<OAuth2DeviceCode | null> {
        this.findOneByUserCodeCalls.push(userCode);

        const id = this.userCodes.get(userCode);
        if (!id) {
            return null;
        }

        const request = this.requests.get(id);
        if (!request) {
            return null;
        }

        return this.merge(request);
    }

    async popOneById(id: string): Promise<OAuth2DeviceCode | null> {
        this.popOneByIdCalls.push(id);

        const request = this.requests.get(id);
        if (!request) {
            return null;
        }

        const entity = this.merge(request);

        this.requests.delete(id);
        this.decisions.delete(id);
        this.polls.delete(id);

        return entity;
    }

    async removeById(id: string): Promise<void> {
        this.removeByIdCalls.push(id);

        this.requests.delete(id);
        this.decisions.delete(id);
        this.polls.delete(id);
    }

    async decide(id: string, decision: OAuth2DeviceCodeDecision, expiresAt: number): Promise<boolean> {
        this.decideCalls.push({
            id, 
            decision, 
            expiresAt, 
        });

        if (expiresAt <= Math.floor(Date.now() / 1000)) {
            return false;
        }

        if (this.decisions.has(id)) {
            return false;
        }

        this.decisions.set(id, decision);

        return true;
    }

    async removeUserCode(userCode: string): Promise<void> {
        this.removeUserCodeCalls.push(userCode);

        this.userCodes.delete(userCode);
    }

    async touchPoll(id: string): Promise<boolean> {
        this.touchPollCalls.push(id);

        if (this.polls.has(id)) {
            return false;
        }

        this.polls.set(id, Date.now());

        return true;
    }

    async lookupThrottle(key: string): Promise<number | null> {
        this.lookupThrottleCalls.push(key);

        const deadline = this.locks.get(key);
        if (typeof deadline !== 'number') {
            return null;
        }

        const remaining = deadline - Math.floor(Date.now() / 1000);

        return remaining > 0 ? remaining : null;
    }

    async countLookupMiss(key: string, limit: number): Promise<void> {
        this.countLookupMissCalls.push({ key, limit });

        const count = (this.attempts.get(key) ?? 0) + 1;
        this.attempts.set(key, count);

        if (count >= limit) {
            this.locks.set(key, Math.floor(Date.now() / 1000) + OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW);
        }
    }

    private merge(request: OAuth2DeviceCodeRequest): OAuth2DeviceCode {
        const decision = this.decisions.get(request.id) ?? null;

        return {
            ...request,
            status: decision?.status ?? OAuth2DeviceCodeStatus.PENDING,
            decision,
        };
    }
}
