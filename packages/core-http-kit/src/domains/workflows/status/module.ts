/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseAPI } from '../../base';
import type { IStatusAPI, StatusResponse } from './types';

export class StatusAPI extends BaseAPI implements IStatusAPI {
    async get(): Promise<StatusResponse> {
        const response = await this.client.get('');

        return response.data;
    }
}
