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

    has(key: string) : Promise<boolean>;

    get<T = unknown>(key: string): Promise<T | null>;

    drop(key: string): Promise<void>;

    dropMany(keys: string[]): Promise<void>;

    clear(options?: CacheClearOptions) : Promise<void>;
}
