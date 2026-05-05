/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { generateMetadata } from '@trapi/metadata';
import { Version, generateSwagger, saveSwagger } from '@trapi/swagger';
import fs from 'node:fs';
import path from 'node:path';
import { DIST_PATH, PACKAGE_PATH, SRC_PATH } from '../../../path.ts';
import type { SwaggerOptions } from './type.ts';

export class Swagger {
    protected distPath : string;

    protected srcPath : string;

    protected entrypointPath : string;

    protected options : SwaggerOptions;

    constructor(options: SwaggerOptions) {
        this.distPath = DIST_PATH;
        this.srcPath = SRC_PATH;

        this.entrypointPath = path.join(
            this.srcPath,
            'adapters',
            'http',
            'controllers',
        );

        this.options = options;
    }

    async canGenerate() : Promise<boolean> {
        try {
            let stats = await fs.promises.stat(this.srcPath);
            if (!stats.isDirectory()) {
                return false;
            }

            stats = await fs.promises.stat(this.entrypointPath);

            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    async generate() {
        const metadata = await generateMetadata({
            preset: '@routup/decorators/preset',
            tsconfig: path.join(PACKAGE_PATH, 'tsconfig.json'),
            entryPoint: {
                cwd: this.entrypointPath,
                pattern: '**/*{.ts,.js,.d.ts}',
            },
            ignore: [
                '**/node_modules/**',
            ],
            allow: [
                '**/@authup/**',
            ],
        });

        const spec = await generateSwagger({
            version: Version.V3_2,
            metadata,
            data: {
                name: 'API Documentation',
                servers: [this.options.baseURL],
                securityDefinitions: {
                    bearer: {
                        type: 'apiKey',
                        name: 'Authorization',
                        in: 'header',
                    },
                    basicAuth: {
                        type: 'http',
                        scheme: 'basic',
                    },
                    oauth2: {
                        type: 'oauth2',
                        flows: {
                            password: {
                                tokenUrl: new URL('token', this.options.baseURL).href,
                                scopes: {},
                            },
                        },
                    },
                },
            },
        });

        await saveSwagger(spec, {
            cwd: this.distPath,
            name: 'swagger',
        });
    }

    async exists() : Promise<boolean> {
        try {
            await fs.promises.access(path.join(
                this.distPath,
                'swagger.json',
            ), fs.constants.R_OK | fs.constants.F_OK);

            return true;
        } catch {
            return false;
        }
    }
}
