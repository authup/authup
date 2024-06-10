/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicy } from '@authup/core-kit';
import { isObject } from '@authup/kit';
import zod from 'zod';
import { extractAttributes } from '../../../utils';

const schema = zod.object({
    names: zod.array(zod.string()),
});

/**
 * @throws ZodError
 * @param body
 */
export function validateAttributeNamesPolicyShaping(body: Record<string, any>) : Partial<AttributeNamesPolicy> {
    let attributes : Record<string, any>;
    if (isObject(body)) {
        attributes = extractAttributes<keyof AttributeNamesPolicy>(body, ['names']);
    } else {
        attributes = {};
    }

    const result = schema.safeParse(attributes);
    if (result.success === false) {
        throw result.error;
    }

    return result.data;
}
