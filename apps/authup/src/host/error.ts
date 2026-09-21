/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isAuthupError } from '@authup/errors';
import { isObject } from '@authup/kit';
import { isClientError } from 'hapic';
import { stringifyPath } from 'validup';

function describeIssues(issues: unknown) : string[] {
    if (!Array.isArray(issues)) {
        return [];
    }

    return issues
        .filter((issue) : issue is { path: PropertyKey[], message: string } => isObject(issue) &&
            Array.isArray(issue.path) &&
            typeof issue.message === 'string')
        .map((issue) => `  ${stringifyPath(issue.path)}: ${issue.message}`);
}

/**
 * An authup body says what went wrong in its own words; anything else is
 * anchored on the request, because the kit `Client` overwrites a hapic
 * error's message with `response.data.message` whenever the body carries
 * one, and a server answering `{"message":"Not Found"}` would otherwise
 * leave the operator with those two words alone. The method and the url are
 * rendered, the body and the request are not: the request carries the
 * bearer.
 */
export function describeHostError(error: unknown) : string {
    if (isClientError(error)) {
        const body : unknown = error.response?.data;
        if (isAuthupError(body)) {
            return [`${body.code}: ${body.message}`, ...describeIssues(body.issues)].join('\n');
        }

        const request = `${(error.request.method ?? 'GET').toUpperCase()} ${error.request.url}`;
        if (!error.response) {
            return `${error.message} (${request})`;
        }

        const status = `${error.response.status} ${error.response.statusText}`.trim();
        const message = isObject(body) && typeof body.message === 'string' ? body.message : undefined;

        return message ?
            `${status} (${request}): ${message}` :
            `${status} (${request})`;
    }

    return error instanceof Error ? error.message : String(error);
}

const INSPECT_CUSTOM = Symbol.for('nodejs.util.inspect.custom');

/**
 * citty prints a thrown error with `console.error(error)`, which renders the
 * stack and any `cause` chain. This one renders as its message alone, so a
 * failed command says what went wrong and nothing about the CLI's insides.
 */
class HostCommandError extends Error {
    [INSPECT_CUSTOM]() : string {
        return this.message;
    }
}

export async function runHostCommand<T>(fn: () => Promise<T>) : Promise<T> {
    try {
        return await fn();
    } catch (e) {
        throw new HostCommandError(describeHostError(e));
    }
}
