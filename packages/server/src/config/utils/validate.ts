/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import { BaseOptionsInput } from '../type';

const configValidation = zod.object({
    env: zod.string(),
    rootPath: zod.string(),
    writableDirectoryPath: zod.string(),

    redis: zod.lazy(() => zod.union([
        zod.string(),
        zod.boolean(),
        zod.any(),
    ])),
    smtp: zod.lazy(() => zod.union([
        zod.string(),
        zod.boolean(),
        zod.any(),
    ])),
});

export function validateBaseOptionsInput(input: unknown) : BaseOptionsInput {
    return configValidation.partial().parse(input);
}
