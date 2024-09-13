/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { IdentityPolicy } from './types';

export class IdentityPolicyValidator extends Container<IdentityPolicy> {
    protected initialize() {
        this.mount('types', createValidator(z.array(z.string()).optional()));

        this.mount('invert', createValidator(z.boolean().optional()));
    }
}
