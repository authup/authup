/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { PathProvisioningEntity } from './types.ts';
import { createPathValidator } from './utils.ts';

export class PathProvisioningAttributesValidator extends Container<PathProvisioningEntity['attributes']> {
    protected initialize() {
        super.initialize();

        // A folder is addressed by its full path, and `name` / `parentId` are
        // derived from it, so neither is mounted: a file declaring one has it
        // stripped instead of writing a chain the path does not describe.
        this.mount('path', createPathValidator());

        this.mount(
            'displayName',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'description',
            { optional: true },
            createValidator(z.string().min(5).max(4096).nullable()),
        );

        // A folder keeps the realm it was created in (realm immutability).
        this.mount(
            'realmId',
            { optional: true },
            createValidator(z.uuid()),
        );
    }
}
