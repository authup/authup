/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral, Parameter, Schema } from '@rapiq/core';
import type { ActorContext } from '@authup/server-kit';

export type QueryParameter = `${Parameter}`;

/**
 * Caller context threaded through the decode into every schema
 * validate hook (rapiq `ParseQueryOptions['context']`). Carries the
 * acting identity so per-key gates — the relations read gate — can
 * consult its permissions. An actor-less context is a SYSTEM call
 * and passes ungated; request surfaces always supply an actor (an
 * anonymous one holds no grants, so gated includes strip).
 */
export type QueryDecodeContext = {
    actor?: ActorContext,
};

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
    /**
     * The acting identity, forwarded to the schema validate hooks as
     * the decode context. Every REQUEST decode must pass it — the
     * HTTP adapter builds an actor for authenticated and anonymous
     * requests alike, so restriction attaches at the request
     * boundary. Omitting it marks a SYSTEM decode, which runs
     * unrestricted.
     */
    actor?: ActorContext,
};
