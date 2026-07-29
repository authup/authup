/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';

const IDENTIFIER_PATTERN = /^[A-Za-z0-9_]+$/;

/**
 * Constraint, table and column names are interpolated into DDL (neither
 * dialect binds identifiers as parameters). The names are static module
 * data, so this only guards against a malformed entry reaching the
 * database as executable text.
 */
export function assertIdentifier(value: string) : void {
    if (!IDENTIFIER_PATTERN.test(value)) {
        throw new AuthupError(`The identifier ${value} is not a plain identifier.`);
    }
}
