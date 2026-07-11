/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
    options?: LoginThrottleServiceOptions,
};

export interface ILoginThrottleService {
    /**
     * Throw LoginThrottledError when recent LOGIN_FAILED audit events for the
     * (identifier, ip) pair hit the threshold.
     */
    assertNotThrottled(ctx: {
        identifier: string, 
        ipAddress?: string, 
        realmId?: string | null 
    }): Promise<void>;
}
