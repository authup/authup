/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';
import {
    ValidupError,
    buildErrorMessageForAttribute,
    isValidupError,
} from 'validup';
import { defineIssueItem } from '@ebec/core';
import { JWTError } from '@authup/specs';
import { useRequestQuery } from '@routup/basic/query';
import { readFromLocations, useRequestToken } from '../../../../request/index.ts';
import { TokenRequestValidator } from './validator.ts';

export async function extractTokenFromRequest(event: IAppEvent) : Promise<string> {
    // RFC 7662 §2.1 / RFC 7009 §2.1: the token travels in the form body. A
    // url is kept by access logs, proxies and browser history, so a token
    // there is refused rather than read.
    if (typeof useRequestQuery(event, 'token') !== 'undefined') {
        throw new ValidupError([
            defineIssueItem({
                path: ['token'],
                message: 'The token must be sent in the request body, not in the url.',
            }),
        ]);
    }

    const body = await readFromLocations(event, ['body']);

    // A token supplied in the body is THE token, whatever it looks like.
    // Falling back to the caller's own bearer when it fails validation would
    // answer about a different token than the one asked for: a resource
    // server forwarding a malformed client token to `/token/introspect` would
    // get its OWN credential reported as active, and `/token/revoke` would
    // revoke the caller's token instead of the one named. A present but
    // unreadable value is therefore reported as an unreadable token (a
    // `JWTError`, which both endpoints answer per RFC 7662 / 7009 §2.2), and
    // only an empty one is a malformed request.
    if (Object.prototype.hasOwnProperty.call(body, 'token')) {
        if (typeof body.token !== 'string' || body.token.length === 0) {
            throw new ValidupError([
                defineIssueItem({
                    path: ['token'],
                    message: buildErrorMessageForAttribute('token'),
                }),
            ]);
        }

        try {
            const validator = new TokenRequestValidator();
            const data = await validator.run({ token: body.token });
            return data.token;
        } catch (e) {
            if (!isValidupError(e)) {
                throw e;
            }

            throw JWTError.invalid();
        }
    }

    // No token parameter at all: the request is about the bearer itself
    // (`GET /token/introspect` with only an Authorization header).
    const token = useRequestToken(event);
    if (!token) {
        throw new ValidupError([
            defineIssueItem({
                path: ['token'],
                message: buildErrorMessageForAttribute('token'),
            }),
        ]);
    }

    return token;
}
