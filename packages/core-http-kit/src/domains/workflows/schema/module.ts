/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseAPI } from '../../base';
import type { ISchemaAPI, SchemaCollectionResponse, SchemaRecordResponse } from './types';

export class SchemaAPI extends BaseAPI implements ISchemaAPI {
    async getMany(): Promise<SchemaCollectionResponse> {
        const response = await this.client.get('schemas');

        return response.data;
    }

    async getOne(name: string): Promise<SchemaRecordResponse> {
        const response = await this.client.get(`schemas/${name}`);

        return response.data;
    }
}
