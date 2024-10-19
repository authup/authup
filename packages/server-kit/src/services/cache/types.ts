/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface Cache {
    set(key: string, value: any, options: CacheSetOptions) : Promise<void>;

    get(key: string) : Promise<any | undefined>;

    drop(key: string) : Promise<void>;
}

export type CacheSetOptions = {
    /**
     * Time to live in milliseconds (ms).
     */
    ttl?: number
};
