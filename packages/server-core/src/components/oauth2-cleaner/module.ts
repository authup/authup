/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import cron from 'node-cron';
import { LessThan } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { OAuth2AuthorizationCodeEntity, OAuth2RefreshTokenEntity } from '../../domains';
import type { Component } from '../types';

export function createOAuth2Cleaner() : Component {
    return {
        async start() {
            const dataSource = await useDataSource();
            const authorizationCodeRepository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);
            const refreshTokenRepository = dataSource.getRepository(OAuth2RefreshTokenEntity);

            const execute = async () => {
                const isoDate = new Date().toISOString();

                await authorizationCodeRepository
                    .delete({
                        expires: LessThan(isoDate),
                    });

                await refreshTokenRepository
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
