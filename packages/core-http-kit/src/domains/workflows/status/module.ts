/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseAPI } from '../../base.ts';
import type { IStatusAPI, StatusResponse } from './types.ts';
import type { APIRequestOptions } from '../../types-base.ts';
import { buildRequestConfig } from '../../utils.ts';

export class StatusAPI extends BaseAPI implements IStatusAPI {
    async get(options?: APIRequestOptions): Promise<StatusResponse> {
        const response = await this.client.get('', buildRequestConfig(options));

        return response.data;
    }
}
