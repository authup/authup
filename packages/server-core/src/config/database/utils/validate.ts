/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import zod from 'zod';
import { DatabaseOptionsInput } from '../type';

const configValidation = zod.object({
    adminUsername: zod.string().min(3).max(128),
    adminPassword: zod.string().min(3).max(256),
    adminPasswordReset: zod.boolean().optional(),
    robotEnabled: zod.boolean(),
    robotSecret: zod.string().min(3).max(256),
    robotSecretReset: zod.boolean().optional(),
    permissions: zod.string().array().optional(),
});

export function validateDatabaseOptionsInput(input: unknown) : DatabaseOptionsInput {
    return configValidation.partial().parse(input);
}
