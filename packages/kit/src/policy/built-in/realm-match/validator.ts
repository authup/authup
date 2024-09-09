/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container, type ContainerOptions } from 'validup';
import { z } from 'zod';
import { DecisionStrategy } from '../../../constants';
import type { RealmMatchPolicy } from './types';

export class RealmMatchPolicyValidator extends Container<RealmMatchPolicy> {
    constructor(options: ContainerOptions<RealmMatchPolicy> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('decisionStrategy', createValidator(z.nativeEnum(DecisionStrategy).optional()));

        this.mount('attributeName', createValidator(z.string().min(3).or(z.array(z.string().min(3))).optional()));
        this.mount('attributeNameStrict', createValidator(z.boolean().optional()));
        this.mount('attributeNullMatchAll', createValidator(z.boolean().optional()));

        this.mount('identityMasterMatchAll', createValidator(z.boolean().optional()));

        this.mount('invert', createValidator(z.boolean().optional()));
    }
}
