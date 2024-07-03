/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import type { TimePolicyOptions } from './types';
import { TimePolicyInterval } from './constants';

const schema = zod.object({
    start: zod.date().or(zod.string()).or(zod.number()).optional(),
    end: zod.date().or(zod.string()).or(zod.number()).optional(),
    interval: zod.nativeEnum(TimePolicyInterval).optional(),
    dayOfWeek: zod.number().min(0).max(6).optional(),
    dayOfMonth: zod.number().min(1).max(31).optional(),
    dayOfYear: zod.number().min(1).max(366).optional(),
});

export function parseTimePolicyOptions(input: unknown) : Partial<TimePolicyOptions> {
    const result = schema.safeParse(input);
    if (result.success === false) {
        throw result.error;
    }

    return result.data;
}
