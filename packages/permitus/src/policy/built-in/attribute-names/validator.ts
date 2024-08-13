/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import { z } from 'zod';
import type { AttributeNamesPolicy } from './types';

export class AttributeNamesPolicyValidator extends Container<AttributeNamesPolicy> {
    constructor(options: ContainerOptions<AttributeNamesPolicy> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('names', createValidator(z.array(z.string().min(3).max(128))));

        this.mount('invert', createValidator(z.boolean().optional()));
    }
}
