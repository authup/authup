/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type PaginationLoadFn = (data?: any) => Promise<void> | void;
export type PaginationOptions = {
    busy: boolean,
    meta?: Record<string, any>,
    load: PaginationLoadFn,
    total?: number
};
