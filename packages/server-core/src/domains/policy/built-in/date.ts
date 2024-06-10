/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DatePolicy } from '@authup/core-kit';
import { isObject } from '@authup/kit';

import zod from 'zod';
import { extractAttributes } from '../../../utils';

const schema = zod.object({
    start: zod.date().or(zod.string()).or(zod.number()).optional(),
    end: zod.date().or(zod.string()).or(zod.number()).optional(),
});

/**
 * @throws ZodError
 * @param body
 */
export function validateDatePolicyShaping(body: Record<string, any>) : Partial<DatePolicy> {
    let attributes : Record<string, any>;
    if (isObject(body)) {
        attributes = extractAttributes<keyof DatePolicy>(body, [
            'end',
            'start',
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
