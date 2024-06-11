/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributesPolicy } from '@authup/kit';
import { isObject } from '@authup/kit';
import zod from 'zod';
import { extractAttributes } from '../../../utils';

const schema = zod.object({
    query: zod.any(),
});

/**
 * @throws ZodError
 * @param body
 */
export function validateAttributesPolicyShaping(body: Record<string, any>) : Partial<AttributesPolicy> {
    let attributes : Record<string, any>;
    if (isObject(body)) {
        attributes = extractAttributes<keyof AttributesPolicy>(body, ['query']);
    } else {
        attributes = {};
    }
    const result = schema.safeParse(attributes);
    if (result.success === false) {
        throw result.error;
    }

    return result.data;
}
