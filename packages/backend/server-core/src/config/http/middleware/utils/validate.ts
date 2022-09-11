/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import { HTTPMiddlewareOptionsInput } from '../type';

const configValidation = zod.object({
    bodyParser: zod.boolean(),
    cookieParser: zod.boolean(),
    response: zod.boolean(),
    swaggerEnabled: zod.boolean(),
    swaggerDirectoryPath: zod.string(),
});

export function validateHTTPMiddlewareOptionsInput(input: unknown) : HTTPMiddlewareOptionsInput {
    return configValidation.partial().parse(input);
}
