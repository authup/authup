/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthorizationHeader, AuthorizationHeaderType } from './type';
import { AuthorizationHeaderError } from '../../error';

export function parseAuthorizationHeader(value: string): AuthorizationHeader {
    const parts: string[] = value.split(' ');

    if (parts.length < 2) {
        throw AuthorizationHeaderError.parseType();
    }

    const type: string = parts[0].toLowerCase();
    const id: string = parts[1];

    switch (type) {
        case 'basic':
            const base64Decoded = Buffer.from(id, 'base64').toString('utf-8');
            const base64Parts = base64Decoded.split(':');

            if (base64Parts.length !== 2) {
                throw AuthorizationHeaderError.parse();
            }

            return {
                type: AuthorizationHeaderType.BASIC,
                username: base64Parts[0],
                password: base64Parts[1],
            };
        case 'bearer':
            return {
                type: AuthorizationHeaderType.BEARER,
                token: id,
            };
        case 'api-key':
        case 'x-api-key':
            return {
                type: type === 'api-key' ?
                    AuthorizationHeaderType.API_KEY :
                    AuthorizationHeaderType.X_API_KEY,
                key: id,
            };
        default:
            throw AuthorizationHeaderError.parseType();
    }
}

export function stringifyAuthorizationHeader(header: AuthorizationHeader): string {
    switch (header.type) {
        case AuthorizationHeaderType.BASIC:
            const basicStr: string = Buffer
                .from(`${header.username}:${header.password}`)
                .toString('base64');

            return `Basic ${basicStr}`;
        case AuthorizationHeaderType.BEARER:
            return `Bearer ${header.token}`;
        case AuthorizationHeaderType.X_API_KEY:
        case AuthorizationHeaderType.API_KEY:
            return `${header.type} ${header.key}`;
    }
}
