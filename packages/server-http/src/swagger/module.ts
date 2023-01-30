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
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { loadFile } from 'locter';
import { SwaggerDocumentCreateContext } from './type';
import { getSwaggerEntrypoint } from './utils';

export async function generateSwaggerDocumentation(
    context: SwaggerDocumentCreateContext,
) : Promise<Record<SwaggerDocFormatType, SwaggerDocFormatData>> {
    const entryPoint = getSwaggerEntrypoint();
    const metadataConfig : MetadataConfig = {
        entryPoint,
        ignore: [
            '**/node_modules/**',
        ],
        allow: [
            '**/@authup/**',
        ],
        decorator: {
            internal: true,
            preset: [
                'routup',
            ],
        },
    };

    const swaggerConfig : Specification.Config = {
        yaml: true,
        host: context.baseUrl,
        name: 'API Documentation',
        basePath: '/',
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

    try {
        const filePath = path.join(context.rootPath, 'package.json');

        await fs.promises.access(filePath);
        const packageJson : Record<string, any> = await loadFile(filePath);
        if (packageJson.name) {
            swaggerConfig.name = `${packageJson.name} - API Documentation`;
        }
        if (packageJson.description) {
            swaggerConfig.description = packageJson.description;
        }
        if (packageJson.version) {
            swaggerConfig.version = packageJson.version;
        }
    } catch (e) {
        // do nothing
    }

    return generateDocumentation({
        metadata: metadataConfig,
        swagger: swaggerConfig,
    }, { });
}
