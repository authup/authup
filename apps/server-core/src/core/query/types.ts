/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral, Parameter, Schema } from '@rapiq/core';

export type QueryParameter = `${Parameter}`;

export type DecodeQueryOptions<RECORD extends ObjectLiteral = ObjectLiteral> = {
    /**
     * The schema (or name of the registered schema) to validate
     * against.
     */
    schema: Schema<RECORD> | string,
    /**
     * Restrict which parameters are processed (default: all). A
     * parameter that is not listed is neither parsed nor defaulted.
     * E.g. a bulk-delete selection processes `['filters']` only, so a
     * schema `pagination.maxLimit` can never silently truncate the
     * affected row set.
     */
    parameters?: QueryParameter[],
};
