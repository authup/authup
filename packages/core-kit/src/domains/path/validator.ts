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
import { PATH_SEGMENT_MAX_LENGTH } from './constants';
import type { Path } from './entity';
import { isPathSegmentValid } from './utils';

export class PathValidator extends Container<
    Path
> {
    protected override initialize() {
        super.initialize();

        const nameValidator = createValidator(
            z
                .string()
                .trim()
                .toLowerCase()
                .min(1)
                .max(PATH_SEGMENT_MAX_LENGTH)
                .check((ctx) => {
                    try {
                        isPathSegmentValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The path segment is not valid.',
                        });
                    }
                }),
        );

        this.mount(
            'name',
            { group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING] },
            nameValidator,
        );
        this.mount(
            'name',
            {
                group: ValidatorGroup.UPDATE,
                optional: true,
            },
            nameValidator,
        );

        this.mount(
            'parentId',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );

        this.mount(
            'displayName',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'description',
            { optional: true },
            createValidator(z.string().min(5).max(4096).nullable()),
        );

        // A folder keeps the realm it was created in (realm immutability).
        this.mount(
            'realmId',
            {
                group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING],
                optional: true,
            },
            createValidator(z.uuid()),
        );
    }
}
