/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidatorGroup } from '@authup/kit';
import { buildZodIssuesForError } from '@validup/zod';
import type { ParsePayload } from 'zod/v4/core';
import type { Container } from 'validup';
import { isValidupError } from 'validup';

/**
 * Run a provisioning entity validator over every array element with the
 * PROVISIONING group (zod check closures do not inherit the validup run
 * group) and write the validated output back, so validator transforms
 * (canonicalization, stripping) reach the synchronizers.
 */
export function createProvisioningEntitiesValidator(
    validator: Container<any>,
): (ctx: ParsePayload<any[]>) => Promise<void> {
    return async (ctx) => {
        for (let i = 0; i < ctx.value.length; i++) {
            try {
                ctx.value[i] = await validator.run(ctx.value[i], { group: ValidatorGroup.PROVISIONING });
            } catch (e) {
                if (isValidupError(e)) {
                    ctx.issues.push(...buildZodIssuesForError(e).map((issue) => ({
                        ...issue,
                        path: [i, ...(issue.path ?? [])],
                    })));
                }
            }
        }
    };
}
