/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'routup';
import type { IDIContainer } from '../../../../core/di/types';
import { registerErrorMiddleware } from '../../../../adapters/http';

export class HTTPMiddlewareModule {
    async mountBefore(router: Router, container: IDIContainer): Promise<void> {

    }

    async mountAfter(router: Router, container: IDIContainer): Promise<void> {
        registerErrorMiddleware(router);
    }
}
