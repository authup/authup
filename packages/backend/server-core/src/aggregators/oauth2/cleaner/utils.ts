/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { LessThan } from 'typeorm';
import { useDataSource } from '../../../database';
import { OAuth2AccessTokenEntity, OAuth2AuthorizationCodeEntity, OAuth2RefreshTokenEntity } from '../../../domains';
import { Logger } from '../../../config';

export async function cleanUp(logger?: Logger) {
    if (logger) {
        logger.info('Checking for expired access-tokens, refresh-tokens & authorization-codes...');
    }

    // ------------------------------------------------------------------------------

    const dataSource = await useDataSource();
    const authorizationCodeRepository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);

    await authorizationCodeRepository
        .delete({
            expires: LessThan(new Date()),
        });

    // ------------------------------------------------------------------------------

    const accessTokenRepository = dataSource.getRepository(OAuth2AccessTokenEntity);
    await accessTokenRepository
        .delete({
            expires: LessThan(new Date()),
        });

    // ------------------------------------------------------------------------------

    const refreshTokenRepository = dataSource.getRepository(OAuth2RefreshTokenEntity);

    await refreshTokenRepository
        .delete({
            expires: LessThan(new Date()),
        });
}
