/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CLIENT_TOKEN_EXCHANGE_CAPABILITY_ACTION_PATTERN,
    CLIENT_TOKEN_EXCHANGE_CAPABILITY_TYPE_PATTERN,
} from '@authup/core-kit';
import { OAuth2RequestError } from '@authup/specs';
import {
    OAUTH2_CAPABILITY_ID_PATTERN,
    OAUTH2_CAPABILITY_MAX_BYTES,
    OAUTH2_CAPABILITY_MAX_ENTRIES,
} from './constants.ts';
import type { OAuth2Capability } from './types.ts';

function parseEntry(value: string) : OAuth2Capability {
    const segments = value.split(':');

    if (segments.length !== 3) {
        throw OAuth2RequestError.malformed('A cap entry must have the form <type>:<id>:<actions>.');
    }

    const [type, id, actions] = segments as [string, string, string];

    if (!CLIENT_TOKEN_EXCHANGE_CAPABILITY_TYPE_PATTERN.test(type)) {
        throw OAuth2RequestError.malformed('A cap entry has an invalid type.');
    }

    if (!OAUTH2_CAPABILITY_ID_PATTERN.test(id)) {
        throw OAuth2RequestError.malformed('A cap entry has an invalid id.');
    }

    const list = actions.split(',');

    const invalidAction = list.find((action) => !CLIENT_TOKEN_EXCHANGE_CAPABILITY_ACTION_PATTERN.test(action));

    if (typeof invalidAction !== 'undefined') {
        throw OAuth2RequestError.malformed('A cap entry has an invalid action.');
    }

    if (new Set(list).size !== list.length) {
        throw OAuth2RequestError.malformed('A cap entry repeats an action.');
    }

    return {
        type,
        id,
        actions: list,
        value,
    };
}

/**
 * Parses the space-separated `cap` parameter of a token exchange. Only the
 * syntax is decided here: the type is checked against a policy afterwards,
 * and id and actions stay opaque to authup.
 *
 * @throws OAuth2RequestError
 */
export function parseOAuth2Capabilities(input: string) : OAuth2Capability[] {
    if (new TextEncoder().encode(input).length > OAUTH2_CAPABILITY_MAX_BYTES) {
        throw OAuth2RequestError.malformed(`The cap parameter must not exceed ${OAUTH2_CAPABILITY_MAX_BYTES} bytes.`);
    }

    const entries = input.split(' ');

    if (entries.length > OAUTH2_CAPABILITY_MAX_ENTRIES) {
        throw OAuth2RequestError.malformed(`The cap parameter must not exceed ${OAUTH2_CAPABILITY_MAX_ENTRIES} entries.`);
    }

    if (new Set(entries).size !== entries.length) {
        throw OAuth2RequestError.malformed('The cap parameter repeats an entry.');
    }

    return entries.map((entry) => parseEntry(entry));
}
