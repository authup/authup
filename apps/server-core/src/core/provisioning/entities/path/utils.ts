/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PATH_MAX_LENGTH, isPathValid } from '@authup/core-kit';
import { createValidator } from '@validup/zod';
import { z } from 'zod';

/**
 * A caller-supplied slash path, trimmed and lowercased. Shared by the folder
 * entry itself and by the `path` relation a user or client is filed under.
 */
export function createPathValidator() {
    return createValidator(
        z
            .string()
            .trim()
            .toLowerCase()
            .min(1)
            .max(PATH_MAX_LENGTH)
            .check((ctx) => {
                try {
                    isPathValid(ctx.value, { throwOnFailure: true });
                } catch (e) {
                    ctx.issues.push({
                        input: ctx.value,
                        code: 'custom',
                        message: e instanceof Error ? e.message : 'The path is not valid.',
                    });
                }
            }),
    );
}
