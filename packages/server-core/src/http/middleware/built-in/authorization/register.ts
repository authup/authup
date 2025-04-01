/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { coreHandler } from 'routup';
import type { Router } from 'routup';
import { useDataSourceSync } from '../../../../database';
import { AuthorizationMiddleware } from './module';

export function registerAuthorizationMiddleware(router: Router) {
    const dataSource = useDataSourceSync();
    const middleware = new AuthorizationMiddleware(dataSource);

    router.use(coreHandler(async (
        request,
        response,
        next,
    ) => middleware.run(request, response, next)));
}
