/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWKCacheEntry, JWKCacheKey, JWKCacheOptions } from './types';

type JWKCacheRecord = {
    value: JWKCacheEntry,
    expiresAt: number,
};

export class JWKCache {
    protected readonly ttl: number;

    protected readonly max: number;

    protected entries: Map<string, JWKCacheRecord>;

    protected flights: Map<string, Promise<JWKCacheEntry>>;

    constructor(options?: JWKCacheOptions) {
        this.ttl = options?.ttl ?? 300;
        this.max = options?.max ?? 100;
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

        const flight = Promise.resolve()
            .then(load)
            .then((entry) => {
                this.entries.delete(key);
                this.entries.set(key, { value: entry, expiresAt: Date.now() + this.ttl * 1000 });
                while (this.entries.size > this.max) {
                    this.entries.delete(this.entries.keys().next().value as string);
                }

                return entry;
            })
            .finally(() => this.flights.delete(key));

        this.flights.set(key, flight);

        return flight;
    }
}
