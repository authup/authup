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
 * A hapic error's own message names the method and the URL and nothing
 * else; the request it carries holds the bearer, so it is never rendered.
 */
export function describeHostError(error: unknown) : string {
    if (isClientError(error)) {
        const body : unknown = error.response?.data;
        if (isAuthupError(body)) {
            return [`${body.code}: ${body.message}`, ...describeIssues(body.issues)].join('\n');
        }

        return error.message;
    }

    return error instanceof Error ? error.message : String(error);
}

/**
 * citty prints a thrown error with `console.error(error)`, which renders a
 * `cause` chain, so the rethrown error carries the text and nothing else.
 */
export async function runHostCommand<T>(fn: () => Promise<T>) : Promise<T> {
    try {
        return await fn();
    } catch (e) {
        // eslint-disable-next-line preserve-caught-error
        throw new Error(describeHostError(e));
    }
}
