/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseAPI } from '../../base.ts';
import type { ISchemaAPI, SchemaCollectionResponse } from './types.ts';
import type { APIRequestOptions } from '../../types-base.ts';
import { buildRequestConfig } from '../../utils.ts';

export class SchemaAPI extends BaseAPI implements ISchemaAPI {
    async getMany(options?: APIRequestOptions): Promise<SchemaCollectionResponse> {
        const response = await this.client.get('schemas', buildRequestConfig(options));

        return response.data;
    }
}
