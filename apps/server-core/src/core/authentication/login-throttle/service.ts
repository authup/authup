/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName } from '@authup/core-kit';
import { LoginThrottledError } from '@authup/errors';
import type { ICache, Logger } from '@authup/server-kit';
// direct file import — the entities barrel reaches every entity service, and a
// value import of it from here would pull that graph in at module init.
import { EVENT_ACTOR_NAME_MAX_LENGTH } from '../../entities/event/constants.ts';
import type { IEventRepository } from '../../entities/index.ts';
import type {
    ILoginThrottleService,
    LoginThrottleContext,
    LoginThrottleServiceContext,
    LoginThrottleServiceOptions,
} from './types.ts';

const DEFAULT_THRESHOLD = 5;
const DEFAULT_WINDOW_SECONDS = 900;

/**
 * Attempts in flight are counted in fixed buckets of this length, the current
 * one plus the one before it. An attempt runs for moments, so two buckets
 * cover it; a bucket is only written while it is current, so a slot that was
 * never released (a crash between reserve and release, a cache failure on the
 * release) lapses within two buckets however often the pair retries. One
 * counter re-armed on every attempt would instead keep it alive for as long as
 * the attempts continue.
 */
const INFLIGHT_BUCKET_MS = 60 * 1_000;

export class LoginThrottleService implements ILoginThrottleService {
    protected repository: IEventRepository;

    protected cache?: ICache;

    protected logger?: Logger;

    protected options: LoginThrottleServiceOptions;

    constructor(ctx: LoginThrottleServiceContext) {
        this.repository = ctx.repository;
        this.cache = ctx.cache;
        this.logger = ctx.logger;
        this.options = ctx.options ?? {};
    }

    async assertNotThrottled(ctx: LoginThrottleContext): Promise<boolean> {
        if (!this.options.enabled) {
            return false;
        }

        // The (identifier, ip) pair is the account-lockout-DoS mitigation: an
        // attacker on one IP can never lock the victim's other IPs. Without a
        // derivable IP the pair does not exist, so the throttle fails open
        // instead of degrading to a lockable per-identifier key.
        if (!ctx.ipAddress) {
            return false;
        }

        const threshold = this.options.threshold ?? DEFAULT_THRESHOLD;
        const windowSeconds = this.options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;

        // reserve the attempt BEFORE counting: an attempt that already ended
        // has recorded its row before releasing, so each attempt is seen
        // either as a row or as in flight, never as neither.
        // an unreachable cache must not fail every login: the attempt is then
        // not reserved, and the audit-row count alone still throttles.
        let inflight = 0;
        let reserved = false;
        if (this.cache) {
            try {
                inflight = await this.reserve(ctx);
                reserved = true;
            } catch (e) {
                this.logger?.warn(`Could not reserve a login attempt: ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        let count : number;
        try {
            count = await this.repository.countRecent({
                name: EventName.LOGIN_FAILED,
                // the loginFailed rows are persisted with the actor name truncated
                // to the column bound — an untruncated key would never match its
                // own rows, silently failing open for over-long identifiers.
                actorName: ctx.identifier.slice(0, EVENT_ACTOR_NAME_MAX_LENGTH),
                requestIpAddress: ctx.ipAddress,
                realmId: ctx.realmId,
                since: new Date(Date.now() - (windowSeconds * 1_000)).toISOString(),
            });
        } catch (e) {
            if (reserved) await this.release(ctx);
            throw e;
        }

        if (count >= threshold) {
            if (reserved) await this.release(ctx);
            throw new LoginThrottledError({ retryAfter: windowSeconds });
        }

        // the threshold is only full of attempts still running: those end
        // within moments, so the caller may retry almost at once.
        if (count + inflight >= threshold) {
            if (reserved) await this.release(ctx);
            throw new LoginThrottledError({
                message: 'Too many concurrent login attempts. Please try again.',
                retryAfter: 1,
            });
        }

        return reserved;
    }

    async release(ctx: LoginThrottleContext): Promise<void> {
        if (!this.options.enabled || !ctx.ipAddress || !this.cache) {
            return;
        }

        // best effort: the outcome of the attempt must reach the caller, and
        // a slot not returned lapses with its bucket. The current bucket is
        // decremented even when the slot was reserved in the previous one:
        // in flight is the sum of both, so either keeps it exact.
        try {
            await this.cache.increment(this.buildKey(ctx, this.currentBucket()), -1, { ttl: INFLIGHT_BUCKET_MS * 2 });
        } catch (e) {
            this.logger?.warn(`Could not release a login attempt: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Reserve a slot and answer how many other attempts of the pair are in
     * flight.
     */
    protected async reserve(ctx: LoginThrottleContext): Promise<number> {
        const cache = this.cache as ICache;
        const bucket = this.currentBucket();

        const current = await cache.increment(this.buildKey(ctx, bucket), 1, { ttl: INFLIGHT_BUCKET_MS * 2 });
        const previous = await cache.get(this.buildKey(ctx, bucket - 1));

        // a release landing in a later bucket than its reservation leaves the
        // later one below zero until it lapses, so never report less than none
        return Math.max(0, current - 1 + (typeof previous === 'number' ? previous : 0));
    }

    protected currentBucket(): number {
        return Math.floor(Date.now() / INFLIGHT_BUCKET_MS);
    }

    protected buildKey(ctx: LoginThrottleContext, bucket: number): string {
        return `loginAttempt:${ctx.realmId ?? ''}:${ctx.identifier}:${ctx.ipAddress}:${bucket}`;
    }
}
