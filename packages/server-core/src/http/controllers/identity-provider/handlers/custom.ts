/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    IdentityProviderProtocol,
} from '@authup/core-kit';
import {
    CookieName,
} from '@authup/core-http-kit';
import type { SerializeOptions } from '@routup/basic/cookie';
import { setResponseCookie } from '@routup/basic/cookie';
import type { Request, Response } from 'routup';
import { sendRedirect } from 'routup';
import type { DataSource } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import {
    IdentityProviderRepository,
    createOAuth2IdentityProviderFlow,
} from '../../../../domains';
import { EnvironmentName } from '../../../../env';
import { IDPAccountService } from '../../../../services';
import { setRequestIdentity, useRequestParamID } from '../../../request';
import { InternalGrantType } from '../../../oauth2';
import { useConfig } from '../../../../config';

async function resolve(dataSource: DataSource, id: string) {
    const repository = new IdentityProviderRepository(dataSource);
    const entity = await repository.findOneWithAttributes({
        relations: {
            realm: true,
        },
        where: {
            id,
        },
    });

    if (!entity) {
        throw new NotFoundError();
    }

    return entity;
}

export async function authorizeURLIdentityProviderRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const entity = await resolve(dataSource, id);

    if (
        entity.protocol !== IdentityProviderProtocol.OAUTH2 &&
        entity.protocol !== IdentityProviderProtocol.OIDC
    ) {
        throw new BadRequestError('Only an identity-provider based on the oauth protocol supports authorize redirect.');
    }

    const flow = createOAuth2IdentityProviderFlow(entity);

    return sendRedirect(res, flow.buildAuthorizeURL());
}

/* istanbul ignore next */
export async function authorizeCallbackIdentityProviderRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParamID(req);
    const dataSource = await useDataSource();

    const entity = await resolve(dataSource, id);

    if (
        entity.protocol !== IdentityProviderProtocol.OAUTH2 &&
        entity.protocol !== IdentityProviderProtocol.OIDC
    ) {
        throw new Error(`The provider protocol ${entity.protocol} is not valid.`);
    }

    const flow = createOAuth2IdentityProviderFlow(entity);

    const identity = await flow.getIdentityForRequest(req);
    const manager = new IDPAccountService(dataSource, entity);

    const account = await manager.save(identity);
    const grant = new InternalGrantType();

    setRequestIdentity(req, {
        type: 'user',
        id: account.user_id,
        realmId: entity.realm.id,
        realmName: entity.realm.name,
    });

    const token = await grant.run(req);
    const config = useConfig();

    const cookieOptions : SerializeOptions = {};
    if (config.env === EnvironmentName.PRODUCTION) {
        cookieOptions.domain = new URL(config.publicUrl).hostname;
    }

    setResponseCookie(res, CookieName.ACCESS_TOKEN, token.access_token, {
        ...cookieOptions,
        maxAge: config.tokenAccessMaxAge * 1000,
    });

    setResponseCookie(res, CookieName.REFRESH_TOKEN, token.refresh_token, {
        ...cookieOptions,
        maxAge: config.tokenRefreshMaxAge * 1000,
    });

    return sendRedirect(res, config.authorizeRedirectUrl);
}
