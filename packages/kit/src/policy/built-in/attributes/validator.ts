/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container, type ContainerOptions } from 'validup';
import { z } from 'zod';
import type { AttributesPolicy } from './types';

export class AttributesPolicyValidator<
    T extends Record<string, any> = Record<string, any>,
> extends Container<AttributesPolicy<T>> {
    constructor(options: ContainerOptions<AttributesPolicy<T>> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('query', createValidator(z.object({}).passthrough()));

        this.mount('invert', createValidator(z.boolean().optional()));
    }
}
