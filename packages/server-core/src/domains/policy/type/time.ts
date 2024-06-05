/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TimePolicy } from '@authup/kit';
import { isObject } from '@authup/kit';
import zod from 'zod';
import { extractAttributes } from '../../../utils';

const schema = zod.object({
    notAfter: zod.date().or(zod.string()).or(zod.number()),
    notBefore: zod.date().or(zod.string()).or(zod.number()),
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
