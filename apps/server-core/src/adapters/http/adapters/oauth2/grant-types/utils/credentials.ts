/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2Error } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import { AuthorizationHeaderType, parseAuthorizationHeader } from 'hapic';
import type { Request } from 'routup';

export type ExtractedClientCredentials = {
    clientId?: string,
    clientSecret?: string,
};

/**
 * Extract client credentials from an OAuth2 token endpoint request.
 *
 * Per RFC 6749 §2.3.1, the server MUST NOT support multiple client
 * authentication methods in a single request. This helper rejects requests
 * that present credentials in BOTH the Basic Authorization header and the
 * request body.
 */
export function extractClientCredentialsFromRequest(req: Request): ExtractedClientCredentials {
    const bodyClientId = readStringBody(req, 'client_id');
    const bodyClientSecret = readStringBody(req, 'client_secret');
    const hasBodyCredentials = !!bodyClientId || !!bodyClientSecret;

    const basicCredentials = parseBasicCredentials(req);

    if (hasBodyCredentials && basicCredentials) {
        throw OAuth2Error.requestInvalid(
            'Client credentials must be provided either via Basic Authorization header or request body, not both.',
        );
    }

    if (hasBodyCredentials) {
        return { clientId: bodyClientId, clientSecret: bodyClientSecret };
    }

    if (basicCredentials) {
        return basicCredentials;
    }

    return {};
}

function readStringBody(req: Request, key: string): string | undefined {
    const value = useRequestBody(req, key);
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseBasicCredentials(req: Request): ExtractedClientCredentials | undefined {
    const headerValue = req.headers.authorization;
    if (typeof headerValue !== 'string') {
        return undefined;
    }

    let header;
    try {
        header = parseAuthorizationHeader(headerValue);
    } catch {
        // Malformed Authorization header — surface as 400 invalid_request
        // rather than letting hapic's error propagate as 500.
        throw OAuth2Error.requestInvalid('Malformed Authorization header.');
    }

    if (header.type !== AuthorizationHeaderType.BASIC) {
        return undefined;
    }

    return { clientId: header.username, clientSecret: header.password };
}
