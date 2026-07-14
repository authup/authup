/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup } from '@authup/kit';
import { isError as isRawError } from '@authup/errors';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { TrustAnchor } from './types.ts';
import { isTrustAnchorNameValid } from './utils.ts';

export class TrustAnchorValidator extends Container<TrustAnchor> {
    protected override initialize() {
        super.initialize();

        const nameValidator = createValidator(
            z
                .string()
                .trim()
                .toLowerCase()
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isTrustAnchorNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: isRawError(e) ? e.message : 'The trust anchor name is not valid.',
                        });
                    }
                }),
        );

        this.mount('name', { group: ValidatorGroup.CREATE }, nameValidator);
        this.mount('name', {
            group: ValidatorGroup.UPDATE,
            optional: true,
        }, nameValidator);

        this.mount(
            'certificate',
            { group: ValidatorGroup.CREATE },
            createValidator(z.string().min(64).max(65536)),
        );

        this.mount(
            'enabled',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'realm_id',
            {
                group: ValidatorGroup.CREATE,
                optional: true,
            },
            createValidator(z.uuid().nullable()),
        );
    }
}
