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
