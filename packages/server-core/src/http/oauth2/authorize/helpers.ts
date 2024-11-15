/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createHash } from 'node:crypto';

export function generateOAuth2CodeVerifier() {
    const length = 64;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

    let codeVerifier = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
        codeVerifier += charset[randomValues[i] % charset.length];
    }

    return codeVerifier;
}

export function buildOauth2CodeChallenge(codeVerifier: string) {
    return createHash('sha256')
        .update(codeVerifier)
        .digest('hex');
}
