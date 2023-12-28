/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { makeURLPublicAccessible } from '@authup/core';
import { defineGetter, dycraft } from 'dycraft';
import zod from 'zod';
import type { UIOptions, UIOptionsInput } from './type';

export function parseUIConfig(input: unknown) : UIOptionsInput {
    const schema = zod.object({
        port: zod.number().nonnegative().optional(),
        host: zod.string().optional(),
        apiUrl: zod.string().url().optional(),
        publicUrl: zod.string().url().optional(),
    });

    return schema.parse(input);
}
export function createUIConfig(data: UIOptionsInput = {}) : UIOptions {
    return dycraft({
        data,
        defaults: {
            port: 3000,
            host: '0.0.0.0',
            apiUrl: 'http://127.0.0.1:3001/',
        },
        getters: {
            publicUrl: defineGetter((
                context,
            ) => `http://${makeURLPublicAccessible(context.get('host'))}:${context.get('port')}/`),
        },
    });
}
