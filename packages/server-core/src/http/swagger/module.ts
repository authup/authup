/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'node:url';
import {
    Version, generate,
} from '@routup/swagger';
import type { SwaggerDocumentCreateContext } from './type';
import { getSwaggerEntrypoint } from './utils';

export async function generateSwaggerDocumentation(
    context: SwaggerDocumentCreateContext,
) {
    const entryPoint = getSwaggerEntrypoint();

    return generate({
        version: Version.V2,
        options: {
            metadata: {
                cache: false,
                entryPoint,
                ignore: [
                    '**/node_modules/**',
                ],
                allow: [
                    '**/@authup/**',
                ],
            },
            yaml: true,
            servers: [context.baseUrl],
            name: 'API Documentation',
            outputDirectory: context.writableDirectoryPath,
            securityDefinitions: {
                bearer: {
                    name: 'Bearer',
                    type: 'apiKey',
                    in: 'header',
                },
                oauth2: {
                    type: 'oauth2',
                    flows: {
                        password: {
                            tokenUrl: `${new URL('token', context.baseUrl).href}`,
                        },
                    },
                },
                basicAuth: {
                    type: 'http',
                    schema: 'basic',
                },
            },
            consumes: [],
            produces: [],
        },
    });
}
