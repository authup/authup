/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuditEvent } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    AuditEventRecordInput,
    IAuditEventService,
} from '../../../../src/core/entities/audit-event/types.ts';

export class FakeAuditEventService implements IAuditEventService {
    public recordCalls: AuditEventRecordInput[] = [];

    async record(input: AuditEventRecordInput): Promise<void> {
        this.recordCalls.push(input);
    }

    async getMany(): Promise<EntityRepositoryFindManyResult<AuditEvent>> {
        return {
            data: [],
            meta: {
                total: 0,
                limit: 50,
                offset: 0,
            },
        };
    }

    async getOne(): Promise<AuditEvent> {
        throw new Error('not implemented');
    }
}
