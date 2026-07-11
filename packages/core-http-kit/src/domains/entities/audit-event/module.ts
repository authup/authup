/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { AuditEvent } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { IAuditEventAPI } from './types';

export class AuditEventAPI extends BaseAPI implements IAuditEventAPI {
    async getMany(data?: BuildInput<AuditEvent>): Promise<EntityCollectionResponse<AuditEvent>> {
        const response = await this.client.get(`audit-events${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: AuditEvent['id'], record?: BuildInput<AuditEvent>): Promise<EntityRecordResponse<AuditEvent>> {
        const response = await this.client.get(`audit-events/${id}${buildQuery(record)}`);

        return response.data;
    }
}
