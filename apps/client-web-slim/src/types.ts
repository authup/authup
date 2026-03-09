/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

export type HydrationPayload<T extends Record<string, any> = Record<string, any>> = {
    config: {
        publicURL: string,
        [key: string]: any
    },
    data: T
};
