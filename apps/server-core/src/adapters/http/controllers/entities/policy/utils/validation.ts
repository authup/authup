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
import { createValidator } from '@validup/zod';
import { z } from 'zod';
import type { PolicyEntity } from '../../../../../database/domains/index.ts';
import { RequestHandlerOperation } from '../../../../request/index.ts';
import { PolicyAttributesValidator } from './attributes-validator.ts';

export class PolicyValidator extends Container<PolicyEntity & { parent_id?: string | null }> {
    protected initialize() {
        super.initialize();

        const nameValidator = createValidator(
            z.string()
                .trim()
                .toLowerCase()
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isPolicyNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The policy name is not valid.',
                        });
                    }
                }),
        );

        this.mount('name', { group: RequestHandlerOperation.CREATE }, nameValidator);
        this.mount('name', {
            group: RequestHandlerOperation.UPDATE,
            optional: true,
        }, nameValidator);

        this.mount(
            'display_name',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'invert',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'type',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.string().min(3).max(128)),
        );

        this.mount(
            'parent_id',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );

        this.mount(
            'realm_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid().nullable()),
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
                    path: ctx.path,
                }));

                return Promise.all(promises);
            },
        );
    }
}
