/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import { isPolicyNameValid } from '@authup/core-kit';
import { isObject } from 'smob';
import type { ValidatorContext } from 'validup';
import { Container } from 'validup';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import type {
    PolicyEntity,
} from '../../../../../database/domains/index.ts';
import { RequestHandlerOperation } from '../../../../request/index.ts';
import { PolicyAttributesValidator } from './attributes-validator.ts';

export class PolicyValidator extends Container<PolicyEntity & { parent_id?: string | null }> {
    protected initialize() {
        super.initialize();

        const nameValidator = createValidator(() => {
            const chain = createValidationChain();
            return chain
                .exists()
                .notEmpty()
                .isString()
                .isLength({
                    min: 3,
                    max: 128,
                })
                .custom((value) => isPolicyNameValid(value, { throwOnFailure: true }));
        });

        this.mount('name', { group: RequestHandlerOperation.CREATE }, nameValidator);
        this.mount('name', { group: RequestHandlerOperation.UPDATE, optional: true }, nameValidator);

        this.mount(
            'display_name',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isString()
                    .isLength({ min: 3, max: 256 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'invert',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isBoolean();
            }),
        );

        this.mount(
            'type',
            { group: RequestHandlerOperation.CREATE },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isString()
                    .isLength({ min: 3, max: 128 });
            }),
        );

        this.mount(
            'parent_id',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID()
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'realm_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID()
                    .optional({ values: 'null' });
            }),
        );

        this.mount({ optional: true }, new PolicyAttributesValidator({}));

        this.mount(
            'children',
            { optional: true },
            async (ctx: ValidatorContext) => {
                if (!Array.isArray(ctx.value)) {
                    // todo: throw error
                    return undefined;
                }

                if (
                    isObject(ctx.data) &&
                    ctx.data.type !== BuiltInPolicyType.COMPOSITE
                ) {
                    return undefined;
                }

                const promises = ctx.value.map((child) => this.run(child, {
                    group: ctx.group,
                    flat: false,
                    path: ctx.pathAbsolute,
                }));

                return Promise.all(promises);
            },
        );
    }
}
