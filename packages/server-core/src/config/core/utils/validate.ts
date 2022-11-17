/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import { CoreOptionsInput } from '../type';

const configValidation = zod.object({
    env: zod.string(),
    port: zod.number(),
    selfUrl: zod.string().url(),
    webUrl: zod.string().url(),
    rootPath: zod.string(),
    writableDirectoryPath: zod.string(),
    tokenMaxAgeAccessToken: zod.number().nonnegative(),
    tokenMaxAgeRefreshToken: zod.number().nonnegative(),

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

    registration: zod.boolean(),
    emailVerification: zod.boolean(),
    forgotPassword: zod.boolean(),
});

export function validateCoreOptionsInput(input: unknown) : CoreOptionsInput {
    return configValidation.partial().parse(input);
}
