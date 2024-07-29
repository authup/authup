/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type {
    PolicyEntity,
} from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

type PolicyValidationResult = Omit<PolicyEntity, 'children' | 'parent'> & {
    parent_id?: string
};

export class PolicyValidator extends Container<PolicyValidationResult> {
    constructor(options: ContainerOptions<PolicyValidationResult> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('name', createValidator((chain) => chain
            .isString()
            .isLength({ min: 3, max: 128 })));

        this.mount('invert', createValidator((chain) => chain
            .isBoolean()
            .optional({ values: 'undefined' })));

        this.mount('type', createValidator((chain) => chain
            .exists()
            .isString()
            .isLength({ min: 3, max: 128 })));

        this.mount('parent_id', createValidator((chain) => chain
            .exists()
            .isUUID()
            .optional({ nullable: true })));

        this.mount('realm_id', { group: RequestHandlerOperation.CREATE }, createValidator((chain) => chain
            .exists()
            .isUUID()
            .optional({ nullable: true })));
    }
}
