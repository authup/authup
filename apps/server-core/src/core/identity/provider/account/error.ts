/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ErrorCode,
    ValidationError,
    isAuthupError,
    markInstanceof,
    matchesInstanceof,
} from '@authup/errors';

export const IDENTITY_PROVIDER_ACCOUNT_ALREADY_LINKED_ERROR_INSTANCE = Symbol.for('@authup/server-core/IdentityProviderAccountAlreadyLinkedError');

export class IdentityProviderAccountAlreadyLinkedError extends ValidationError {
    constructor() {
        super({
            code: ErrorCode.IDENTITY_PROVIDER_ACCOUNT_ALREADY_LINKED,
            message: 'The external account is already linked to another user.',
        });
        markInstanceof(this, IDENTITY_PROVIDER_ACCOUNT_ALREADY_LINKED_ERROR_INSTANCE);
    }
}

export function isIdentityProviderAccountAlreadyLinkedError(input: unknown): input is IdentityProviderAccountAlreadyLinkedError {
    if (matchesInstanceof(input, IDENTITY_PROVIDER_ACCOUNT_ALREADY_LINKED_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.IDENTITY_PROVIDER_ACCOUNT_ALREADY_LINKED;
}
