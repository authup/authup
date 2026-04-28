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
        // Reject stray client_secret without client_id — otherwise grants
        // that gate auth on `if (clientId)` would silently skip
        // authentication and leak through with the secret discarded.
        if (!bodyClientId) {
            throw OAuth2Error.requestInvalid('client_secret was provided without client_id.');
        }
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

    // RFC 6749 §2.3.1 + Appendix B: client_id and client_secret are
    // application/x-www-form-urlencoded BEFORE base64 encoding in the
    // Authorization header. hapic only base64-decodes; we form-decode here
    // so credentials containing reserved characters (`:`, `+`, `%`, `&`,
    // `=`, etc.) round-trip correctly.
    return {
        clientId: formDecode(header.username),
        clientSecret: formDecode(header.password),
    };
}

function formDecode(value: string): string {
    try {
        // application/x-www-form-urlencoded: '+' represents space; %XX is
        // percent-encoded UTF-8.
        return decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
        // Malformed percent-encoding — return raw value rather than
        // throwing; the caller will still validate via authentication.
        return value;
    }
}
