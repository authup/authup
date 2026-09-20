/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RESOURCE_METHODS } from './constants.ts';

export type ResourceOperation = keyof typeof RESOURCE_METHODS;

export type ResourceCommandArgs = {
    _: string[],
    operation: string,
    id?: string,
    query?: string,
    data?: string,
};
