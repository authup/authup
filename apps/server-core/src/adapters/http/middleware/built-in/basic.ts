/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@routup/basic';
import { basic } from '@routup/basic';
import type { IApp } from 'routup';

export const BODY_OPTIONS_DEFAULT = {
    json: { limit: '1mb' },
    urlEncoded: { limit: '1mb' },
} satisfies Options['body'];

type BodyOptions = Exclude<Options['body'], boolean | undefined>;

function withLimit<T extends BodyOptions['json'] | BodyOptions['urlEncoded']>(
    input: T,
    fallback: { limit: string },
) {
    if (input === false) {
        return false;
    }

    if (typeof input === 'object' && input !== null) {
        return { ...fallback, ...input };
    }

    return fallback;
}

/**
 * The body options for the configured value. An options object keeps the
 * json and url-encoded parsers on at the default limit unless it sets a
 * parser to false or names a limit of its own: @routup/body enables only the
 * parsers an object names, and enables both without a limit when it names
 * none.
 */
export function buildBodyOptions(input: boolean | Record<string, any> | undefined) : Options['body'] {
    if (input === false) {
        return false;
    }

    if (typeof input !== 'object' || input === null) {
        return BODY_OPTIONS_DEFAULT;
    }

    return {
        ...input,
        json: withLimit(input.json, BODY_OPTIONS_DEFAULT.json),
        urlEncoded: withLimit(input.urlEncoded, BODY_OPTIONS_DEFAULT.urlEncoded),
    };
}

export function registerBasicMiddleware(router: IApp, input?: Options) {
    router.use(basic(input));
}
