/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'node:url';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    CookieName,
    IdentityProviderProtocol,
} from '@authup/core-kit';
import type { SerializeOptions } from '@routup/basic/cookie';
import { setResponseCookie } from '@routup/basic/cookie';
import type { Request, Response } from 'routup';
import { sendRedirect, useRequestParam } from 'routup';
import { EnvironmentName, useDataSource } from 'typeorm-extension';
import { IdentityProviderRepository, createIdentityProviderAccount, createOAuth2IdentityProviderFlow } from '../../../../domains';
import { setRequestEnv } from '../../../utils';
import { InternalGrantType } from '../../../oauth2';
import { useConfig } from '../../../../config';

async function resolve(id: string) {
    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);
    const entity = await repository.createQueryBuilder('provider')
        .leftJoinAndSelect('provider.realm', 'realm')
        .where('provider.id = :id', { id })
        .getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    return repository.extendEntity(entity);
}

export async function authorizeURLIdentityProviderRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParam(req, 'id');
    const entity = await resolve(id);

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
    const id = useRequestParam(req, 'id');
    const entity = await resolve(id);

    if (
        entity.protocol !== IdentityProviderProtocol.OAUTH2 &&
        entity.protocol !== IdentityProviderProtocol.OIDC
    ) {
        throw new Error(`The provider protocol ${entity.protocol} is not valid.`);
    }

    const flow = createOAuth2IdentityProviderFlow(entity);

    const identity = await flow.getIdentityForRequest(req);

    const account = await createIdentityProviderAccount(entity, identity);
    const grant = new InternalGrantType();

    setRequestEnv(req, 'userId', account.user_id);
    setRequestEnv(req, 'realm', entity.realm);

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
