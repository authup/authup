/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TimePolicy } from '@authup/kit';
import { TimePolicyInterval, isObject } from '@authup/kit';

import zod from 'zod';
import { extractAttributes } from '../../../utils';

const schema = zod.object({
    start: zod.date().or(zod.string()).or(zod.number()).optional(),
    end: zod.date().or(zod.string()).or(zod.number()).optional(),
    interval: zod.nativeEnum(TimePolicyInterval).optional(),
    dayOfWeek: zod.number().min(0).max(6).optional(),
    dayOfMonth: zod.number().min(1).max(31).optional(),
    dayOfYear: zod.number().min(1).max(366).optional(),
});

/**
 * @throws ZodError
 * @param body
 */
export function validateTimePolicyShaping(body: Record<string, any>) : Partial<TimePolicy> {
    let attributes : Record<string, any>;
    if (isObject(body)) {
        attributes = extractAttributes<keyof TimePolicy>(body, [
            'end',
            'start',
            'interval',
            'dayOfWeek',
            'dayOfMonth',
            'dayOfYear',
        ]);
    } else {
        attributes = {};
    }
    const result = schema.safeParse(attributes);
    if (result.success === false) {
        throw result.error;
    }

    return result.data;
}
