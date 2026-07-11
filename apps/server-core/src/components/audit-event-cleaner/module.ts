/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import cron from 'node-cron';
import type { AuditEvent } from '@authup/core-kit';
import type { DataSource } from 'typeorm';
import { AuditEventEntity } from '../../adapters/database/domains/index.ts';
import { AuditEventRepositoryAdapter } from '../../app/modules/database/repositories/index.ts';
import type { Component } from '../types.ts';

export function createAuditEventCleanerComponent(dataSource: DataSource) : Component {
    return {
        async start() {
            const repository = new AuditEventRepositoryAdapter(
                dataSource.getRepository<AuditEvent>(AuditEventEntity),
            );

            const execute = async () => {
                // Rows carry a per-row expires_at stamped at write time from
                // auditLogRetentionDays; null = keep forever.
                await repository.deleteExpired(new Date().toISOString());
            };

            await execute();

            cron.schedule('* * * * *', async () => {
                await execute();
            });
        },
    };
}
