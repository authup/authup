/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWKType } from '@authup/specs';
import { AsymmetricKey } from '@authup/server-kit';
import {
    DController, 
    DGet, 
    DPath, 
    DRequest, 
    DResponse,
} from '@routup/decorators';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { KeyEntity } from '../../../../database/domains/index.ts';
import { getRequestStringParam } from '../../../request/index.ts';

export type JwkControllerContext = {
    repository: Repository<KeyEntity>
};

@DController('')
export class JwkController {
    protected repository: Repository<KeyEntity>;

    constructor(ctx: JwkControllerContext) {
        this.repository = ctx.repository;
    }

    @DGet('/jwks', [])
    async getManyJwks(
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const realmId = getRequestStringParam(req, 'realmId');

        const entities = await this.repository.find({
            where: {
                type: In([JWKType.RSA, JWKType.EC]),
                ...(realmId ? {
                    realm_id: realmId 
                } : {}),
            },
            order: {
                priority: 'DESC',
            },
        });

        const promises = entities
            .filter((entity) => !!entity.encryption_key)
            .map(
                (entity) => AsymmetricKey
                    .fromBase64({
                        format: 'spki',
                        key: entity.encryption_key!,
                        options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signature_algorithm),
                    })
                    .then((container) => container.toJWK())
                    .then((key) => ({
                        ...key,
                        kid: entity.id,
                        alg: entity.signature_algorithm,
                    })),
            );

        const keys = await Promise.all(promises);

        return send(res, {
            keys,
        });
    }

    @DGet('/jwks/:id', [])
    async getOneJwks(
        @DPath('id') id: string,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const entity = await this.repository.findOne({
            where: {
                type: In([JWKType.RSA, JWKType.EC]),
                id,
            },
        });

        if (!entity) {
            throw new NotFoundError();
        }

        if (!entity.encryption_key) {
            throw new BadRequestError('The encryption key does not exist');
        }

        const container = await AsymmetricKey
            .fromBase64({
                format: 'spki',
                key: entity.encryption_key!,
                options: AsymmetricKey.buildImportOptionsForJWTAlgorithm(entity.signature_algorithm),
            });

        const jsonWebKey = await container.toJWK();
        jsonWebKey.alg = entity.signature_algorithm;

        return send(res, {
            ...jsonWebKey,
            kid: entity.id,
        });
    }
}
