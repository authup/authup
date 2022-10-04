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
import { loadJsonFile } from 'locter';
import { SwaggerDocumentCreateContext } from './type';
import { getSwaggerEntrypointRootPath } from './utils';

export async function generateSwaggerDocumentation(
    context: SwaggerDocumentCreateContext,
) : Promise<Record<SwaggerDocFormatType, SwaggerDocFormatData>> {
    const packageJson : Record<string, any> = await loadJsonFile(path.join(context.rootPath, 'package.json'));

    const metadataConfig : MetadataConfig = {
        entryFile: '**/*{.ts,.js,.d.ts}',
        rootPath: getSwaggerEntrypointRootPath(),
        ignore: [
            '**/node_modules/**',
        ],
        allow: [
            '**/@authelion/**',
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
        host: context.baseUrl,
        name: `${packageJson.name} - API Documentation`,
        description: packageJson.description,
        basePath: '/',
        version: packageJson.version,
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
        consumes: ['application/json'],
        produces: ['application/json'],
    };

    return generateDocumentation({
        metadata: metadataConfig,
        swagger: swaggerConfig,
    }, { });
}
