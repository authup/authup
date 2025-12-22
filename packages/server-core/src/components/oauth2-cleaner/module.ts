/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import cron from 'node-cron';
import type { DataSource } from 'typeorm';
import { LessThan } from 'typeorm';
import { SessionEntity } from '../../adapters/database/domains';
import type { Component } from '../types';

export function createOAuth2CleanerComponent(dataSource: DataSource) : Component {
    return {
        async start() {
            const sessionRepository = dataSource.getRepository(SessionEntity);

            const execute = async () => {
                const isoDate = new Date().toISOString();

                await sessionRepository
                    .delete({
                        expires: LessThan(isoDate),
                    });
            };

            await execute();

            cron.schedule('* * * * *', async () => {
                await execute();
            });
        },
    };
}
