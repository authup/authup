/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocationQuery } from 'vue-router';

export type OAuth2QueryParameters = {
    client_id: string,
    redirect_uri: string,
    response_type: string,
    scope: string | string[],
    state?: string
};

export function extractOAuth2QueryParameters(
    query: LocationQuery,
) : OAuth2QueryParameters {
    if (
        typeof query.client_id !== 'string' ||
        !query.client_id ||
        query.client_id.length === 0
    ) {
        throw new Error('The client_id is invalid');
    }

    if (
        typeof query.redirect_uri !== 'string' ||
        !query.redirect_uri ||
        query.redirect_uri.length === 0
    ) {
        throw new Error('The redirect_uri is invalid');
    }

    if (typeof query.response_type === 'undefined') {
        query.response_type = 'code';
    }

    if (
        typeof query.response_type !== 'string' ||
        query.response_type.length === 0
    ) {
        throw new Error('The response_type is invalid');
    }

    if (typeof query.scope === 'undefined') {
        query.scope = '';
    }

    if (Array.isArray(query.scope)) {
        query.scope = query.scope.join(' ');
    }

    let state : string | undefined;
    if (typeof query.state === 'string') {
        state = decodeURIComponent(query.state);
    }

    return {
        client_id: decodeURIComponent(query.client_id),
        response_type: query.response_type,
        redirect_uri: decodeURIComponent(query.redirect_uri),
        scope: decodeURIComponent(query.scope || ''),
        state,
    };
}

export function isGlobMatch(target: string, pattern: string | string[]) {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    for (let i = 0; i < patterns.length; i++) {
        if (target === patterns[i]) {
            return true;
        }
    }

    return false;
}
