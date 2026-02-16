/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import zod from 'zod';
import type { ProvisioningEntityMergeStrategy, ProvisioningEntityReplaceStrategy, ProvisioningEntityStrategy } from './types.ts';

export class ProvisioningStrategyValidator extends Container<ProvisioningEntityStrategy> {
    constructor(options: ContainerOptions<ProvisioningEntityStrategy> = {}) {
        super({
            ...options,
            oneOf: true,
        });
    }

    protected initialize() {
        super.initialize();

        const mergeContainer = new Container<ProvisioningEntityMergeStrategy>();
        mergeContainer.mount('type', createValidator(
            zod
                .enum(['merge']),
        ));
        mergeContainer.mount('attributes', createValidator(
            zod
                .array(z.string())
                .optional(),
        ));
        this.mount(mergeContainer);

        const altContainer = new Container<ProvisioningEntityReplaceStrategy>();
        mergeContainer.mount('type', createValidator(
            zod
                .enum(['replace', 'createOnly']),
        ));
        this.mount(altContainer);
    }
}
