/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, markInstanceof } from '@authup/errors';

export const KEY_CERTIFICATE_ERROR_INSTANCE = Symbol.for('@authup/server-core/KeyCertificateError');

/**
 * Certificate parsing/key-association failure independent of any transport.
 * API-facing services may translate this to their own boundary error.
 */
export class KeyCertificateError extends AuthupError {
    constructor(message: string) {
        super({ message });
        markInstanceof(this, KEY_CERTIFICATE_ERROR_INSTANCE);
    }
}
