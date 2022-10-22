/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Brackets } from 'typeorm';
import {
    QueryFieldsApplyOptions,
    applyQuery,
    useDataSource,
} from 'typeorm-extension';
import { NotFoundError } from '@ebec/http';
import { OAuth2SubKind, PermissionID, isSelfId } from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { OAuth2ClientEntity } from '../../../../domains';
import { resolveOAuth2SubAttributesForScope } from '../../../../oauth2';

export async function getManyClientRouteHandler(req: ExpressRequest, res: ExpressResponse): Promise<any> {
    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ClientEntity);

    const query = repository.createQueryBuilder('client');

    const options : QueryFieldsApplyOptions<OAuth2ClientEntity> = {
        defaultAlias: 'client',
        default: [
            'name',
            'description',
            'redirect_uri',
            'grant_types',
            'scope',
            'is_confidential',
            'realm_id',
            'user_id',
            'updated_at',
            'created_at',
        ],
    };

    if (req.ability.has(PermissionID.CLIENT_EDIT)) {
        options.allowed = ['secret'];
    }

    const { pagination } = applyQuery(query, req.query, {
        defaultPath: 'client',
        fields: options,
        filters: {
            allowed: ['realm_id', 'realm.name'],
        },
        pagination: {
            maxLimit: 50,
        },
        relations: {
            allowed: ['realm'],
        },
        sort: {
            allowed: ['id', 'created_at', 'updated_at'],
        },
    });

    const [entities, total] = await query.getManyAndCount();

    return res.respond({
        data: {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        },
    });
}

export async function getOneClientRouteHandler(req: ExpressRequest, res: ExpressResponse): Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ClientEntity);

    const query = repository.createQueryBuilder('client');

    if (
        isSelfId(id) &&
        req.clientId
    ) {
        const attributes = resolveOAuth2SubAttributesForScope(OAuth2SubKind.CLIENT, req.scopes);
        for (let i = 0; i < attributes.length; i++) {
            query.addSelect(`client.${attributes[i]}`);
        }

        query.where('client.id = :id', { id });
    } else {
        query.where(new Brackets((q2) => {
            q2.where('client.id = :id', { id });
            q2.orWhere('client.name LIKE :name', { name: id });
        }));
    }

    const options : QueryFieldsApplyOptions<OAuth2ClientEntity> = {
        defaultAlias: 'client',
        default: [
            'name',
            'description',
            'redirect_uri',
            'grant_types',
            'scope',
            'is_confidential',
            'realm_id',
            'user_id',
            'updated_at',
            'created_at',
        ],
    };

    if (req.ability.has(PermissionID.CLIENT_EDIT)) {
        options.allowed = ['secret'];
    }

    applyQuery(query, req.query, {
        defaultPath: 'client',
        fields: options,
        relations: {
            allowed: ['realm'],
        },
    });

    const result = await query.getOne();

    if (!result) {
        throw new NotFoundError();
    }

    return res.respond({
        data: result,
    });
}
