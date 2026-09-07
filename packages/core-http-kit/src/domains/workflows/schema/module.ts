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
        // Encoded because the name is a plain string by contract, not an
        // `EntityType`: the registry is documented as extensible, so a caller
        // may legitimately pass one this package does not know, and a `/` in
        // it would otherwise address a different route entirely.
        const response = await this.client.get(`schemas/${encodeURIComponent(name)}`);

        return response.data;
    }
}
