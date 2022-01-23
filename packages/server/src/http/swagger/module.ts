/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    MetadataConfig,
    Specification,
    SwaggerDocFormatData,
    SwaggerDocFormatType,
    generateDocumentation,
} from '@trapi/swagger';
import path from 'path';
import { URL } from 'url';
import { SwaggerDocumentationCreateContext } from './type';

export async function generateSwaggerDocumentation(
    context: SwaggerDocumentationCreateContext,
) : Promise<Record<SwaggerDocFormatType, SwaggerDocFormatData>> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require,import/no-dynamic-require
    const packageJson = require(path.join(context.rootDirectoryPath, 'package.json'));

    const metadataConfig : MetadataConfig = {
        entryFile: path.join(__dirname, '..', '..', '..', 'src', 'http', 'controllers', '**', '*{.ts,.js,.d.ts}'),
        ignore: [
            '**/node_modules/**',
            '**/typescript-auth/packages/domains/src/**',
        ],
        decorator: {
            internal: true,
            library: [
                'decorators-express',
            ],
        },
    };

    const swaggerConfig : Specification.Config = {
        yaml: true,
        host: context.selfUrl,
        name: `${packageJson.name} - API Documentation`,
        description: packageJson.description,
        basePath: '/',
        version: packageJson.version,
        outputDirectory: path.join(context.rootDirectoryPath, context.writableDirectory),
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
                        tokenUrl: `${new URL('token', context.selfUrl).href}`,
                    },
                },
            },
            basicAuth: {
                type: 'http',
                schema: 'basic',
            },
        },
        consumes: ['application/json'],
        produces: ['application/json'],
    };

    return generateDocumentation({
        metadata: metadataConfig,
        swagger: swaggerConfig,
    });
}
