/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWTError } from '@authup/specs';
import type { JWKCacheEntry, JWKCacheKey, JWKCacheOptions } from './types';

type JWKCacheRecord = {
    value: JWKCacheEntry,
    expiresAt: number,
};

export class JWKCache {
    protected readonly ttl: number;

    protected readonly max: number;

    protected readonly timeout: number;

    protected entries: Map<string, JWKCacheRecord>;

    protected flights: Map<string, Promise<JWKCacheEntry>>;

    constructor(options?: JWKCacheOptions) {
        this.ttl = options?.ttl ?? 300;
        this.max = options?.max ?? 100;
        this.timeout = options?.timeout ?? 10;

        if (!Number.isFinite(this.ttl) || this.ttl < 0) {
            throw new TypeError('The JWK cache ttl must be a finite, non-negative number of seconds.');
        }

        if (!Number.isSafeInteger(this.max) || this.max < 0) {
            throw new TypeError('The JWK cache max must be a non-negative integer.');
        }

        // setTimeout clamps a delay above 2^31 - 1 ms to 1 ms
        if (!Number.isFinite(this.timeout) || this.timeout <= 0 || this.timeout * 1000 > 2_147_483_647) {
            throw new TypeError('The JWK cache timeout must be a positive number of seconds, at most 2147483.');
        }
        this.entries = new Map();
        this.flights = new Map();
    }

    resolve(input: JWKCacheKey, load: () => Promise<JWKCacheEntry>): Promise<JWKCacheEntry> {
        const key = `${input.realmId}:${input.kid}`;

        const record = this.entries.get(key);
        if (record) {
            if (record.expiresAt > Date.now()) {
                return Promise.resolve(record.value);
            }

            this.entries.delete(key);
        }

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
        const flight : Promise<JWKCacheEntry> = Promise.race([
            Promise.resolve().then(load),
            deadline,
        ])
            .then((entry) => {
                this.entries.delete(key);
                this.entries.set(key, { value: entry, expiresAt: Date.now() + this.ttl * 1000 });
                for (const k of this.entries.keys()) {
                    if (this.entries.size <= this.max) {
                        break;
                    }

                    this.entries.delete(k);
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
