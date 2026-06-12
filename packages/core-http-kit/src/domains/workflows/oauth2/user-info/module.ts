/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserInfoAPI } from '@hapic/oauth2';
import type { IOAuth2UserInfoAPI } from '../types';

export class OAuth2UserInfoAPI extends UserInfoAPI implements IOAuth2UserInfoAPI {

}
