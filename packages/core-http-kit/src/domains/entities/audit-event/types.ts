/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import type { AuditEvent } from '@authup/core-kit';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

/**
 * Read-only client — the audit log is append-only: rows are written
 * server-side at the emit points and pruned by the retention sweep.
 */
export interface IAuditEventAPI {
    getMany(data?: BuildInput<AuditEvent>): Promise<EntityCollectionResponse<AuditEvent>>;

    getOne(id: AuditEvent['id'], record?: BuildInput<AuditEvent>): Promise<EntityRecordResponse<AuditEvent>>;
}
