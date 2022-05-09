/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LessThan } from 'typeorm';
import { OAuth2AccessTokenEntity, OAuth2RefreshTokenEntity } from '../../../domains';
import { useDataSource } from '../../../database';

export async function runOAuth2TokenCleaner() {
    const dataSource = await useDataSource();
    const accessTokenRepository = dataSource.getRepository(OAuth2AccessTokenEntity);
    const refreshTokenRepository = dataSource.getRepository(OAuth2RefreshTokenEntity);

    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await accessTokenRepository
        .delete({
            expires: LessThan(date) as unknown as Date,
        });

    await refreshTokenRepository
        .delete({
            expires: LessThan(date) as unknown as Date,
        });
}
