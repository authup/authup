/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';

export type OAuth2AuthorizeStateData = {
    codeRequest?: OAuth2AuthorizationCodeRequest
};
