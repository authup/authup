/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import { z } from 'zod';
import type { PolicyData } from '../../types';
import { PolicyDataIdentityValidator } from './identity';
import { PolicyDataPermissionValidator } from './permission';

export class PolicyDataValidator extends Container<PolicyData> {
    constructor(options: ContainerOptions<PolicyData> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        // todo: optionalValue should be null
        const identity = new PolicyDataIdentityValidator();
        this.mount(
            'identity',
            {
                optional: true,
                optionalValue: 'undefined',
                optionalInclude: true,
            },
            identity,
        );

        // todo: optionalValue should be null
        const permission = new PolicyDataPermissionValidator();
        this.mount(
            'permission',
            {
                optional: true,
                optionalValue: 'undefined',
                optionalInclude: true,
            },
            permission,
        );

        this.mount('attributes', createValidator(z.object({}).optional()));

        this.mount('dateTime', createValidator(z.date().or(z.string()).or(z.number()).optional()));
    }
}
