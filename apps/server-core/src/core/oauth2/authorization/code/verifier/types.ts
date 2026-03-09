/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode } from '@authup/core-kit';

export type IOAuth2AuthorizationCodeVerifyOptions = {
    redirectUri?: string,
    codeVerifier?: string
};

export interface IOAuth2AuthorizationCodeVerifier {
    verify(code: string, options: IOAuth2AuthorizationCodeVerifyOptions) : Promise<OAuth2AuthorizationCode>;

    remove(entity: OAuth2AuthorizationCode) : Promise<void>;

    removeById(code: string) : Promise<void>;
}
