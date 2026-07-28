/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName } from '@authup/core-kit';
import { LoginThrottledError } from '@authup/errors';
// direct file import — the entities barrel reaches every entity service, and a
// value import of it from here would pull that graph in at module init.
import { EVENT_ACTOR_NAME_MAX_LENGTH } from '../../entities/event/constants.ts';
import type { IEventRepository } from '../../entities/index.ts';
import type { ILoginThrottleService, LoginThrottleServiceContext, LoginThrottleServiceOptions } from './types.ts';

const DEFAULT_THRESHOLD = 5;
const DEFAULT_WINDOW_SECONDS = 900;

export class LoginThrottleService implements ILoginThrottleService {
    protected repository: IEventRepository;

    protected options: LoginThrottleServiceOptions;

    constructor(ctx: LoginThrottleServiceContext) {
        this.repository = ctx.repository;
        this.options = ctx.options ?? {};
    }

    async assertNotThrottled(
        ctx: {
            identifier: string, 
            ipAddress?: string, 
            realmId?: string | null 
        },
    ): Promise<void> {
        if (!this.options.enabled) {
            return;
        }

        // The (identifier, ip) pair is the account-lockout-DoS mitigation: an
        // attacker on one IP can never lock the victim's other IPs. Without a
        // derivable IP the pair does not exist, so the throttle fails open
        // instead of degrading to a lockable per-identifier key.
        if (!ctx.ipAddress) {
            return;
        }

        const threshold = this.options.threshold ?? DEFAULT_THRESHOLD;
        const windowSeconds = this.options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;

        const count = await this.repository.countRecent({
            name: EventName.LOGIN_FAILED,
            // the loginFailed rows are persisted with the actor name truncated
            // to the column bound — an untruncated key would never match its
            // own rows, silently failing open for over-long identifiers.
            actorName: ctx.identifier.slice(0, EVENT_ACTOR_NAME_MAX_LENGTH),
            requestIpAddress: ctx.ipAddress,
            realmId: ctx.realmId,
            since: new Date(Date.now() - (windowSeconds * 1_000)).toISOString(),
        });

        if (count >= threshold) {
            throw new LoginThrottledError({ retryAfter: windowSeconds });
        }
    }
}
