/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { makeURLPublicAccessible } from '@authup/core';
import { Continu } from 'continu';
import zod from 'zod';
import type { UIConfig, UIOptions, UIOptionsInput } from './type';

export function createUIConfig() : UIConfig {
    return new Continu<UIOptions, UIOptionsInput>({
        defaults: {
            port: 3000,
            host: '0.0.0.0',
            apiUrl: 'http://127.0.0.1:3001/',
        },
        getters: {
            publicUrl: (context) => `http://${makeURLPublicAccessible(context.get('host'))}:${context.get('port')}/`,
        },
        validators: {
            port: (value) => zod.number().nonnegative().safeParse(value),
            host: (value) => zod.string().safeParse(value),
            apiUrl: (value) => zod.string().url().safeParse(value),
            publicUrl: (value) => zod.string().url().safeParse(value),
        },
    });
}
