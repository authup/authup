/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import zod from 'zod';
import type { UIOptionsInput } from '../type';

const configValidation = zod.object({
    port: zod.number().nonnegative(),
    host: zod.string(),
    apiUrl: zod.string(),
});

export function validateUiConfig(input: UIOptionsInput) : UIOptionsInput {
    return configValidation.partial().parse(input);
}
