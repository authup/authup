/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWTError } from '@authup/specs';
import type { IVerifierCache } from '../cache';
import type { JWKCacheData, JWKCacheKey, JWKCacheOptions } from './types';

export class JWKResolver {
    protected readonly cache: IVerifierCache;

    protected readonly ttl: number;

    protected readonly timeout: number;

    protected flights: Map<string, Promise<JWKCacheData>>;

    constructor(cache: IVerifierCache, options?: JWKCacheOptions) {
        this.cache = cache;
        this.ttl = options?.ttl ?? 300;
        this.timeout = options?.timeout ?? 10;

        if (!Number.isFinite(this.ttl) || this.ttl < 0) {
            throw new TypeError('The JWK cache ttl must be a finite, non-negative number of seconds.');
        }

        // setTimeout clamps a delay above 2^31 - 1 ms to 1 ms
        if (!Number.isFinite(this.timeout) || this.timeout <= 0 || this.timeout * 1000 > 2_147_483_647) {
            throw new TypeError('The JWK cache timeout must be a positive number of seconds, at most 2147483.');
        }

        this.flights = new Map();
    }

    async resolve(input: JWKCacheKey, load: () => Promise<JWKCacheData>): Promise<JWKCacheData> {
        const cached = await this.cache.getJwk(input);
        if (cached) {
            return cached;
        }

        const key = `${input.realmId}:${input.kid}`;

        const pending = this.flights.get(key);
        if (pending) {
            return pending;
        }

        let timer: ReturnType<typeof setTimeout> | undefined;
        const deadline = new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => {
                reject(new JWTError({ message: 'Fetching the JWK from the auth server timed out.' }));
            }, this.timeout * 1000);
        });

        // A stalled fetch must not pin every later lookup of the key: the
        // flight settles at the deadline, and a load finishing after it is
        // dropped instead of stored.
        const flight : Promise<JWKCacheData> = Promise.race([
            Promise.resolve().then(load),
            deadline,
        ])
            .then(async (entry) => {
                if (this.ttl > 0) {
                    await this.cache.setJwk(input, entry, this.ttl);
                }

                return entry;
            })
            .finally(() => {
                clearTimeout(timer);
                if (this.flights.get(key) === flight) {
                    this.flights.delete(key);
                }
            });

        this.flights.set(key, flight);

        return flight;
    }
}
