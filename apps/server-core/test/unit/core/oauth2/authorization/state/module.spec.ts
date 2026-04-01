/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { OAuth2Error } from '@authup/specs';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { OAuth2AuthorizationStateManager } from '../../../../../../src/core/oauth2/authorization/state/module.ts';
import type {
    IOAuth2AuthorizeStateRepository,
    OAuth2AuthorizationState,
} from '../../../../../../src/core/oauth2/authorization/state/types.ts';

class FakeStateRepository implements IOAuth2AuthorizeStateRepository {
    private store = new Map<string, OAuth2AuthorizationState>();

    async findOneById(id: string): Promise<OAuth2AuthorizationState | null> {
        return this.store.get(id) ?? null;
    }

    async insert(data: OAuth2AuthorizationState): Promise<string> {
        const id = randomUUID();
        this.store.set(id, data);
        return id;
    }

    async remove(id: string): Promise<void> {
        this.store.delete(id);
    }

    has(id: string): boolean {
        return this.store.has(id);
    }
}

describe('OAuth2AuthorizationStateManager', () => {
    let repository: FakeStateRepository;
    let manager: OAuth2AuthorizationStateManager;

    beforeEach(() => {
        repository = new FakeStateRepository();
        manager = new OAuth2AuthorizationStateManager(repository);
    });

    describe('save', () => {
        it('should store state and return an id', async () => {
            const state: OAuth2AuthorizationState = {
                ip: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
            };
            const id = await manager.save(state);
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });
    });

    describe('verify', () => {
        it('should return state when IP matches', async () => {
            const state: OAuth2AuthorizationState = {
                ip: '10.0.0.1',
                userAgent: 'TestAgent',
            };
            const id = await manager.save(state);
            const result = await manager.verify(id, {
                ip: '10.0.0.1',
                userAgent: 'TestAgent' 
            });
            expect(result.ip).toBe('10.0.0.1');
            expect(result.userAgent).toBe('TestAgent');
        });

        it('should throw for non-existent state', async () => {
            await expect(
                manager.verify('non-existent-id', {
                    ip: '1.2.3.4' 
                }),
            ).rejects.toThrow(OAuth2Error);
        });

        it('should throw when IP does not match', async () => {
            const id = await manager.save({
                ip: '10.0.0.1' 
            });
            await expect(
                manager.verify(id, {
                    ip: '10.0.0.2' 
                }),
            ).rejects.toThrow(OAuth2Error);
        });

        it('should throw when user agent does not match', async () => {
            const id = await manager.save({
                ip: '10.0.0.1',
                userAgent: 'Chrome' 
            });
            await expect(
                manager.verify(id, {
                    ip: '10.0.0.1',
                    userAgent: 'Firefox' 
                }),
            ).rejects.toThrow(OAuth2Error);
        });

        it('should remove state after verify (single-use)', async () => {
            const id = await manager.save({
                ip: '10.0.0.1' 
            });
            await manager.verify(id, {
                ip: '10.0.0.1' 
            });
            expect(repository.has(id)).toBe(false);
        });

        it('should remove state even when IP mismatch (replay prevention)', async () => {
            const id = await manager.save({
                ip: '10.0.0.1' 
            });
            await expect(
                manager.verify(id, {
                    ip: '10.0.0.2' 
                }),
            ).rejects.toThrow(OAuth2Error);
            expect(repository.has(id)).toBe(false);
        });

        it('should skip user agent check when payload has no userAgent', async () => {
            const id = await manager.save({
                ip: '10.0.0.1' 
            });
            const result = await manager.verify(id, {
                ip: '10.0.0.1',
                userAgent: 'anything' 
            });
            expect(result.ip).toBe('10.0.0.1');
        });

        it('should skip IP check when payload has empty ip', async () => {
            const id = await manager.save({
                ip: '' 
            });
            const result = await manager.verify(id, {
                ip: '99.99.99.99' 
            });
            expect(result).toBeDefined();
        });
    });
});
