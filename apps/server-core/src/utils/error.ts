/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AuthupError,
    ErrorCode,
    codeFromHttpStatus,
    isAuthupError,
    normalizeError,
} from '@authup/errors';
import { isHTTPError } from '@ebec/http';
import { isClientError } from 'hapic';
import { CodecError, ParseError } from '@rapiq/core';
import { EntityRelationLookupError } from 'typeorm-extension';
import { buildErrorMessageForAttributes, isValidupError, stringifyPath } from 'validup';
import { hasOwnProperty, isObject } from '@authup/kit';

/**
 * Normalize an unknown error to an AuthupError. Recognised shapes:
 *
 * 1. AuthupError instance              → returned as-is
 * 2. EntityRelationLookupError         → BAD_REQUEST AuthupError
 * 3. validup Issue error               → BAD_REQUEST AuthupError carrying issues
 * 4. rapiq ParseError / CodecError     → BAD_REQUEST AuthupError (client wire query)
 * 5. hapic ClientError                 → UPSTREAM_ERROR AuthupError (outbound call)
 * 6. foreign @ebec/http HTTPError      → AuthupError with the closest semantic code
 * 7. driver error w/ a recognised code → ENTITY_CONFLICT or STORAGE_INSUFFICIENT
 * 8. anything else                     → INTERNAL_ERROR AuthupError
 *
 * The HTTP-status concern is handled separately by `httpStatusFromCode` in
 * the adapter — this function only assigns a semantic `code`.
 */
export function sanitizeError(input: unknown): AuthupError {
    if (isAuthupError(input)) {
        return input;
    }

    if (input instanceof EntityRelationLookupError) {
        return new AuthupError({
            code: ErrorCode.ENTITY_RELATION_INVALID,
            message: input.message,
            stack: input.stack,
        });
    }

    if (isValidupError(input)) {
        const paths = input.issues.map((issue) => stringifyPath(issue.path));
        return new AuthupError({
            code: ErrorCode.BAD_REQUEST,
            stack: input.stack,
            message: input.message || buildErrorMessageForAttributes(paths),
            issues: input.issues,
        });
    }

    if (input instanceof ParseError || input instanceof CodecError) {
        return new AuthupError({
            code: ErrorCode.BAD_REQUEST,
            message: input.message,
            stack: input.stack,
        });
    }

    /**
     * An outbound call failed. This branch MUST precede the `isHTTPError`
     * one below: a hapic `HttpResponseError` extends `BaseError` and carries
     * the upstream `status`, so the duck guard matches it and would mirror
     * that status onto our own response. An upstream 400 would then read as
     * "your request was malformed" when the caller's request was fine.
     *
     * The message is deliberately dropped rather than forwarded: hapic
     * embeds the outbound method and URL in it (`400 Bad Request (POST
     * https://idp.example.com/token)`), which must not reach the caller.
     * `describeError` is what carries the detail, into the log only.
     */
    if (isClientError(input)) {
        return new AuthupError({
            code: ErrorCode.UPSTREAM_ERROR,
            message: 'A request to an upstream service failed.',
            stack: input.stack,
        });
    }

    if (isHTTPError(input)) {
        return new AuthupError({
            code: codeFromHttpStatus(input.status),
            message: input.message,
            stack: input.stack,
        });
    }

    if (isObject(input)) {
        const code = hasOwnProperty(input, 'code') &&
        typeof input.code === 'string' ?
            input.code :
            undefined;

        /**
         * @see https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
         */
        switch (code) {
            case '23505':
            case 'ER_DUP_ENTRY':
            case 'SQLITE_CONSTRAINT_UNIQUE': {
                return new AuthupError({
                    code: ErrorCode.ENTITY_CONFLICT,
                    message: 'An entry with some unique attributes already exists.',
                    stack: input.stack as string | undefined,
                });
            }
            case 'ER_DISK_FULL':
                return new AuthupError({
                    code: ErrorCode.STORAGE_INSUFFICIENT,
                    message: 'No database operation possible, due to the lack of free disk space.',
                    stack: input.stack as string | undefined,
                });
        }

        return new AuthupError({
            code: ErrorCode.INTERNAL_ERROR,
            message: input.message as string | undefined,
            stack: input.stack as string | undefined,
        });
    }

    return new AuthupError({ code: ErrorCode.INTERNAL_ERROR });
}

const DESCRIBE_BODY_MAX_LENGTH = 1024;
const DESCRIBE_CAUSE_MAX_DEPTH = 5;

// Fields node attaches to a syscall error. Without them a transport failure
// reads as a bare "connect ECONNREFUSED" with no way back to the reason.
const DESCRIBE_CAUSE_KEYS = ['code', 'errno', 'syscall', 'address', 'port'] as const;

function describeBody(input: unknown): string | undefined {
    let value: string;

    if (typeof input === 'string') {
        value = input;
    } else {
        try {
            value = JSON.stringify(input) ?? String(input);
        } catch {
            // A body that cannot be serialized (circular, a stream) is
            // still worth naming by shape.
            value = Object.prototype.toString.call(input);
        }
    }

    if (value.length === 0) {
        return undefined;
    }

    if (value.length > DESCRIBE_BODY_MAX_LENGTH) {
        return `${value.substring(0, DESCRIBE_BODY_MAX_LENGTH)}… (truncated)`;
    }

    return value;
}

function describeCauseLink(input: object): string {
    const error = input as Error;
    const name = typeof error.name === 'string' ? error.name : 'Error';
    const parts: string[] = [`${name}: ${error.message}`];

    const details: string[] = [];
    for (const key of DESCRIBE_CAUSE_KEYS) {
        const value = (input as Record<string, unknown>)[key];
        if (typeof value === 'string' || typeof value === 'number') {
            details.push(`${key}=${value}`);
        }
    }

    if (details.length > 0) {
        parts.push(`(${details.join(' ')})`);
    }

    return parts.join(' ');
}

function describeCauseChain(input: unknown): string | undefined {
    const links: string[] = [];
    const seen = new Set<unknown>();

    let current: unknown = isObject(input) ? (input as { cause?: unknown }).cause : undefined;

    while (isObject(current) && !seen.has(current) && links.length < DESCRIBE_CAUSE_MAX_DEPTH) {
        seen.add(current);
        links.push(describeCauseLink(current));
        current = (current as { cause?: unknown }).cause;
    }

    if (links.length === 0) {
        return undefined;
    }

    return links.join(' <- ');
}

/**
 * Render an error for the LOG. It is the counterpart of `@authup/errors`'
 * `serializeError`, which renders one for the response.
 *
 * The detail an outbound failure carries never survives `sanitizeError`
 * (by design: upstream internals must not reach the caller), and
 * `Error.cause` is non-enumerable, so a plain serialization drops it too.
 * Both were therefore already gone by the time anything was written,
 * which left a refused connection and an upstream `invalid_request`
 * indistinguishable in the log.
 *
 * Everything not present is omitted, so an ordinary error still renders
 * as its bare message.
 */
export function describeError(input: unknown, headline?: string): string {
    const error = normalizeError(input);

    const lines: string[] = [];
    if (headline) {
        lines.push(headline);
    }
    lines.push(error.message);

    // hapic attaches the decoded body to the response through a getter, so
    // it is non-enumerable and only reachable by an explicit read.
    if (isClientError(error) && error.response) {
        lines.push(`  upstream status: ${error.response.status}`);

        const body = describeBody(error.response.data);
        if (body) {
            lines.push(`  upstream body:   ${body}`);
        }
    }

    const causes = describeCauseChain(error);
    if (causes) {
        lines.push(`  cause:           ${causes}`);
    }

    if (error.stack) {
        lines.push(`  stack:           ${error.stack}`);
    }

    return lines.join('\n');
}
