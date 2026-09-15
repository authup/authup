/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog } from '@authup/access';
import { BaseAPI } from '../../base';
import type { IAuthorizationAPI } from './types';

export class AuthorizationAPI extends BaseAPI implements IAuthorizationAPI {
    async get() : Promise<AuthorizationCatalog> {
        const response = await this.client.get('authorization');

        return response.data;
    }
}
