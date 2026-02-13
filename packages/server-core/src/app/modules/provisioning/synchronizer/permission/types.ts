/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Permission,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';

export type PermissionProvisioningSynchronizerContext = {
    repository: Repository<Permission>,
};
