/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UIOptions as SwaggerUIOptions } from '@routup/swagger-ui';
import { swaggerUI } from '@routup/swagger-ui';
import type { Plugin } from 'routup';

type SwaggerMiddlewareOptions = SwaggerUIOptions & {
    documentPath: string,
};

export function createSwaggerMiddleware(input: SwaggerMiddlewareOptions) : Plugin {
    const { documentPath, ...options } = input;

    return swaggerUI(documentPath, options);
}
