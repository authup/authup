/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type CacheKeyBuildOptions = {
    key: string,
    prefix?: string,
    suffix?: string
};

export type CacheSetOptions = {
    /**
     * Time to live in milliseconds (ms).
     */
    ttl?: number
};

export type CacheClearOptions = {
    prefix?: string,
    suffix?: string
};

export interface ICache {
    set(key: string, value: any, options?: CacheSetOptions) : Promise<void>;

    /**
     * Atomically set the value ONLY if the key does not already exist
     * (set-if-absent). Returns true when the value was stored, false when the
     * key was already present. The building block for a distributed lock —
     * atomic on Redis (`SET … NX`) and on the in-process memory adapter.
     */
    add(key: string, value: any, options?: CacheSetOptions) : Promise<boolean>;

    /**
     * Atomically refresh the TTL only when the stored value still matches the
     * supplied scalar owner token. Used to renew a distributed lock without
     * extending a successor's lease after ownership changed.
     */
    renewIfValue(key: string, value: string, ttl: number): Promise<boolean>;

    /**
     * Atomically delete a key only when its value still matches the supplied
     * scalar owner token. Used to release a distributed lock owner-safely.
     */
    dropIfValue(key: string, value: string): Promise<boolean>;

    /**
     * Atomically increment the numeric value stored at the key by `value`
     * (default 1), treating an absent key as 0, and return the
     * post-increment value. A ttl (re)arms the key's expiry on every call —
     * the building block for a sliding-window counter (attempt throttling).
     * Concurrent increments never lose an update — atomic on Redis
     * (`INCRBY`) and on the in-process memory adapter. Rejects when the key
     * holds a non-numeric value.
     */
    increment(key: string, value?: number, options?: CacheSetOptions) : Promise<number>;

    has(key: string) : Promise<boolean>;

    get<T = unknown>(key: string): Promise<T | null>;

    pop<T = unknown>(key: string): Promise<T | null>;

    drop(key: string): Promise<void>;

    dropMany(keys: string[]): Promise<void>;

    clear(options?: CacheClearOptions) : Promise<void>;
}
