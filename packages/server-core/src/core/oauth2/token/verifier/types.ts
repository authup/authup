/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';

export type OAuth2TokenVerifyOptions = {
    skipActiveCheck?: boolean
};

export interface IOAuth2TokenVerifier {
    verify(token: string, options?: OAuth2TokenVerifyOptions) : Promise<OAuth2TokenPayload>
}
