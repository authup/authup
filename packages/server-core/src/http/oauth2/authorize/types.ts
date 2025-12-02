/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { type IOAuth2AuthorizationCodeRequestVerifier, OAuth2AuthorizationManagerContext } from '../../../core';

export type HTTPOAuth2AuthorizationManagerContext = OAuth2AuthorizationManagerContext & {
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,
};
