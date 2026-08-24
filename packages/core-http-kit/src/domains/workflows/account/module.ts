/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/specs';
import { BaseAPI } from '../../base';
import type { IAccountAPI } from './types';

export class AccountAPI extends BaseAPI implements IAccountAPI {
    async getSession(): Promise<OAuth2TokenIntrospectionResponse> {
        const response = await this.client.get('account/session');

        return response.data;
    }

    async deleteSession(): Promise<void> {
        await this.client.delete('account/session');
    }
}
