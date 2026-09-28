/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICache } from '@authup/server-kit';
import type { IEventRepository } from '../../entities/index.ts';

export type LoginThrottleServiceOptions = {
    /**
     * config.loginAttemptThrottleEnabled — default off.
     */
    enabled?: boolean,
    /**
     * config.loginAttemptThreshold — failed attempts per (identifier, ip) pair
     * before the throttle trips. Default 5.
     */
    threshold?: number,
    /**
     * config.loginAttemptWindow — sliding window (seconds) the attempts are
     * counted over. The window is also the lock: a success simply stops adding
     * rows and the window slides past. Default 900.
     */
    windowSeconds?: number,
};

export type LoginThrottleServiceContext = {
    repository: IEventRepository,
    /**
     * Holds the attempts in flight per (identifier, ip) pair, so concurrent
     * attempts count against the threshold before their audit rows exist.
     */
    cache?: ICache,
    options?: LoginThrottleServiceOptions,
};

export type LoginThrottleContext = {
    identifier: string,
    ipAddress?: string,
    realmId?: string | null,
};

export interface ILoginThrottleService {
    /**
     * Throw LoginThrottledError when recent LOGIN_FAILED audit events plus
     * the attempts still in flight for the (identifier, ip) pair hit the
     * threshold. An admitted attempt must be ended with release().
     */
    assertNotThrottled(ctx: LoginThrottleContext): Promise<void>;

    /**
     * End an attempt admitted by assertNotThrottled, after its outcome has
     * been recorded.
     */
    release(ctx: LoginThrottleContext): Promise<void>;
}
