/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorOptionsInput } from '@authup/errors';
import { AuthupError, ErrorCode } from '@authup/errors';

export class JWKError extends AuthupError {
    constructor(...input: AuthupErrorOptionsInput[]) {
        super({
            code: ErrorCode.JWK_INVALID,
            message: 'The JWK is invalid.',
            statusCode: 400,
        }, ...input);
    }

    static notFound(id?: string) {
        if (typeof id === 'string' && id.length > 0) {
            return new JWKError({
                code: ErrorCode.JWK_NOT_FOUND,
                message: `The JWK ${id} could not be found.`,
            });
        }

        return new JWKError({
            code: ErrorCode.JWK_NOT_FOUND,
            message: 'The requested JWK could not be found.',
        });
    }

    static invalidRealm() {
        return new JWKError({
            code: ErrorCode.JWK_NOT_FOUND,
            message: 'No valid realm for JWK.',
        });
    }

    static notFoundForRealm(id: string, name?: string) {
        let key : string;
        if (name) {
            key = `${name} (${id})`;
        } else {
            key = id;
        }

        return new JWKError({
            code: ErrorCode.JWK_NOT_FOUND,
            message: `No JWK was found for realm ${key}.`,
        });
    }
}
