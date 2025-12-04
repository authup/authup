/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { coreHandler } from 'routup';
import type { Router } from 'routup';
import { container } from 'tsyringe';
import { useDataSourceSync } from '../../../../database';
import { AuthorizationMiddleware } from './module';
import type { IIdentityResolver, IOAuth2TokenVerifier } from '../../../../../core';
import { IDENTITY_RESOLVER_TOKEN, OAUTH2_TOKEN_VERIFIER_TOKEN } from '../../../../../core';
import { useConfig } from '../../../../../config';

export function registerAuthorizationMiddleware(router: Router) {
    const config = useConfig();

    const identityResolver = container.resolve<IIdentityResolver>(
        IDENTITY_RESOLVER_TOKEN,
    );

    const oauth2TokenVerifier = container.resolve<IOAuth2TokenVerifier>(
        OAUTH2_TOKEN_VERIFIER_TOKEN,
    );

    const dataSource = useDataSourceSync();
    const middleware = new AuthorizationMiddleware({
        identityResolver,
        dataSource,
        oauth2TokenVerifier,
        options: {
            clientAuthBasic: config.clientAuthBasic,
            robotAuthBasic: config.robotAuthBasic,
            userAuthBasic: config.userAuthBasic,
        },
    });

    router.use(coreHandler(async (
        request,
        response,
        next,
    ) => middleware.run(request, response, next)));
}
