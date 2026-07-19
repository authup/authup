/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '@authup/kit';
import { JWKUse, JWTAlgorithm } from '@authup/specs';
import { KeyStatus } from './constants';
import type { Key } from './type.ts';
import { isKeyNameValid } from './utils.ts';

export class KeyValidator extends Container<
    Key
> {
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
                        isKeyNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The key name is not valid.',
                        });
                    }
                }),
        );

        this.mount('name', { optional: true }, nameValidator);

        this.mount(
            'use',
            { group: ValidatorGroup.CREATE },
            createValidator(z.enum(JWKUse)),
        );

        this.mount(
            'signatureAlgorithm',
            {
                group: ValidatorGroup.CREATE,
                optional: true,
            },
            createValidator(z.enum(JWTAlgorithm).nullable()),
        );

        this.mount(
            'priority',
            { optional: true },
            createValidator(z.coerce.number().int().min(0)),
        );

        this.mount(
            'status',
            { optional: true },
            createValidator(z.enum(KeyStatus)),
        );

        this.mount(
            'realmId',
            {
                group: ValidatorGroup.CREATE,
                optional: true,
            },
            createValidator(z.uuid().nullable()),
        );

        this.mount(
            'decryptionKey',
            {
                group: ValidatorGroup.CREATE,
                optional: true,
            },
            createValidator(z.string().min(16).max(16384).nullable()),
        );

        this.mount(
            'encryptionKey',
            {
                group: ValidatorGroup.CREATE,
                optional: true,
            },
            createValidator(z.string().min(16).max(16384).nullable()),
        );

        this.mount(
            'certificate',
            {
                group: ValidatorGroup.CREATE,
                optional: true,
            },
            createValidator(z.string().min(64).max(16384).nullable()),
        );
    }
}
