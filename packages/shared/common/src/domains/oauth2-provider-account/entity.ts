/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';
import { OAuth2Provider } from '../oauth2-provider';

export interface OAuth2ProviderAccount {
    id: string;

    access_token: string;

    refresh_token: string;

    provider_user_id: string;

    provider_user_name: string;

    provider_user_email: string;

    expires_in: number;

    expires_at: Date;

    created_at: Date;

    updated_at: Date;

    // -----------------------------------------------

    user_id: string;

    user: User;

    provider_id: string;

    provider: OAuth2Provider;
}
