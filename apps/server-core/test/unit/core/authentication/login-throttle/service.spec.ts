/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { EventName, EventScope } from '@authup/core-kit';
import { isLoginThrottledError } from '@authup/errors';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { LoginThrottleService } from '../../../../../src/core/authentication/login-throttle/service.ts';
import type { LoginThrottleServiceOptions } from '../../../../../src/core/index.ts';
import { FakeEventRepository } from '../../entities/event/fake-repository.ts';

const IDENTIFIER = 'victim-user';
const OTHER_IDENTIFIER = 'other-user';
const IP = '198.51.100.10';
const OTHER_IP = '198.51.100.99';

const THRESHOLD = 3;
const WINDOW_SECONDS = 900;

describe('LoginThrottleService', () => {
    let repository: FakeEventRepository;
    const realmId = randomUUID();

    beforeEach(() => {
        repository = new FakeEventRepository();
    });

    function buildService(options?: LoginThrottleServiceOptions): LoginThrottleService {
        return new LoginThrottleService({
            repository,
            options: options ?? {
                enabled: true,
                threshold: THRESHOLD,
                windowSeconds: WINDOW_SECONDS,
            },
        });
    }

    function seedFailure(data: {
        identifier?: string,
        ip?: string,
        realm?: string | null,
        ageSeconds?: number,
    } = {}): void {
        repository.seed({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN_FAILED,
            actorName: data.identifier ?? IDENTIFIER,
            requestIpAddress: data.ip ?? IP,
            realmId: typeof data.realm === 'undefined' ? realmId : data.realm,
            createdAt: new Date(Date.now() - ((data.ageSeconds ?? 0) * 1_000)).toISOString(),
        });
    }

    function seedFailures(count: number, data: Parameters<typeof seedFailure>[0] = {}): void {
        for (let i = 0; i < count; i++) {
            seedFailure(data);
        }
    }

    it('throttles the (identifier, ip) pair at the threshold', async () => {
        seedFailures(THRESHOLD);

        await expect(buildService().assertNotThrottled({
            identifier: IDENTIFIER,
            ipAddress: IP,
            realmId,
        })).rejects.toSatisfy((e) => isLoginThrottledError(e));
    });

    it('passes below the threshold', async () => {
        seedFailures(THRESHOLD - 1);

        await expect(buildService().assertNotThrottled({
            identifier: IDENTIFIER,
            ipAddress: IP,
            realmId,
        })).resolves.toBeUndefined();
    });

    it('does not throttle the same identifier from a different IP (lockout-DoS mitigation)', async () => {
        seedFailures(THRESHOLD);

        await expect(buildService().assertNotThrottled({
            identifier: IDENTIFIER,
            ipAddress: OTHER_IP,
            realmId,
        })).resolves.toBeUndefined();
    });

    it('does not throttle a different identifier from the same IP', async () => {
        seedFailures(THRESHOLD);

        await expect(buildService().assertNotThrottled({
            identifier: OTHER_IDENTIFIER,
            ipAddress: IP,
            realmId,
        })).resolves.toBeUndefined();
    });

    it('ignores failures outside the sliding window', async () => {
        seedFailures(THRESHOLD, { ageSeconds: WINDOW_SECONDS + 60 });

        await expect(buildService().assertNotThrottled({
            identifier: IDENTIFIER,
            ipAddress: IP,
            realmId,
        })).resolves.toBeUndefined();
    });

    it('scopes the pair to the realm of the attempt', async () => {
        const otherRealmId = randomUUID();
        seedFailures(THRESHOLD, { realm: otherRealmId });

        await expect(buildService().assertNotThrottled({
            identifier: IDENTIFIER,
            ipAddress: IP,
            realmId,
        })).resolves.toBeUndefined();

        await expect(buildService().assertNotThrottled({
            identifier: IDENTIFIER,
            ipAddress: IP,
            realmId: otherRealmId,
        })).rejects.toSatisfy((e) => isLoginThrottledError(e));
    });

    it('never throttles when disabled', async () => {
        seedFailures(THRESHOLD * 3);

        await expect(buildService({
            enabled: false,
            threshold: THRESHOLD,
            windowSeconds: WINDOW_SECONDS,
        }).assertNotThrottled({
            identifier: IDENTIFIER,
            ipAddress: IP,
            realmId,
        })).resolves.toBeUndefined();
    });

    it('is disabled by default (no enabled option)', async () => {
        seedFailures(THRESHOLD * 3);

        await expect(buildService({
            threshold: THRESHOLD,
            windowSeconds: WINDOW_SECONDS,
        }).assertNotThrottled({
            identifier: IDENTIFIER,
            ipAddress: IP,
            realmId,
        })).resolves.toBeUndefined();
    });

    it('fails open when no IP address is derivable', async () => {
        seedFailures(THRESHOLD * 3);

        await expect(buildService().assertNotThrottled({
            identifier: IDENTIFIER,
            realmId,
        })).resolves.toBeUndefined();
    });

    it('throws a LoginThrottledError carrying retryAfter = windowSeconds', async () => {
        seedFailures(THRESHOLD);

        let error: unknown;
        try {
            await buildService().assertNotThrottled({
                identifier: IDENTIFIER,
                ipAddress: IP,
                realmId,
            });
        } catch (e) {
            error = e;
        }

        expect(isLoginThrottledError(error)).toBe(true);
        if (isLoginThrottledError(error)) {
            expect(error.data?.retryAfter).toEqual(WINDOW_SECONDS);
        }
    });
});
