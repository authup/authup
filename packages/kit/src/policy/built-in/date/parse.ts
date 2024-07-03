/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import type { DatePolicyOptions } from './types';

const schema = zod.object({
    start: zod.date().or(zod.string()).or(zod.number()).optional(),
    end: zod.date().or(zod.string()).or(zod.number()).optional(),
});

export function parseDatePolicyOptions(input: unknown) : Partial<DatePolicyOptions> {
    const result = schema.safeParse(input);
    if (result.success === false) {
        throw result.error;
    }

    return result.data;
}
