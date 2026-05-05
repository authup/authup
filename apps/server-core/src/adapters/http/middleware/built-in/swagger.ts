/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Plugin } from 'routup';
import { defineCoreHandler } from 'routup';

type SwaggerMiddlewareOptions = {
    documentPath: string,
};

/**
 * Phase 5 of the routup v5 migration restores the swagger UI via
 * `@routup/swagger-ui` + `@trapi/swagger`. Until then this plugin
 * mounts a 501 handler so the binary boots without the deleted
 * `@routup/swagger` import.
 */
export async function createSwaggerMiddleware(_input: Partial<SwaggerMiddlewareOptions> = {}) : Promise<Plugin> {
    return {
        name: '@authup/swagger-stub',
        install(router) {
            router.use(defineCoreHandler((event) => {
                event.response.status = 501;
                return {
                    statusCode: 501,
                    code: 'NOT_IMPLEMENTED',
                    message: 'Swagger UI is being migrated to routup v5. Re-enable in phase 5.',
                };
            }));
        },
    };
}
