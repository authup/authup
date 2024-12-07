/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Version, generate,
} from '@routup/swagger';
import fs from 'node:fs';
import path from 'node:path';
import { getDistPath, getSrcPath } from '../../path';
import type { SwaggerServiceOptions } from './type';

export class SwaggerService {
    protected distPath : string;

    protected srcPath : string;

    protected entrypointPath : string;

    protected options : SwaggerServiceOptions;

    constructor(options: SwaggerServiceOptions = {}) {
        this.distPath = getDistPath();
        this.srcPath = getSrcPath();

        this.entrypointPath = path.join(this.srcPath, 'http', 'controllers');

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
        } catch (e) {
            return false;
        }
    }

    async generate() {
        return generate({
            version: Version.V2,
            options: {
                metadata: {
                    cache: false,
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
                },
                servers: [this.options.baseUrl],
                name: 'API Documentation',
                outputDirectory: this.distPath,
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
                                tokenUrl: `${new URL('token', this.options.baseUrl).href}`,
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

    async exists() : Promise<boolean> {
        try {
            await fs.promises.access(path.join(
                this.distPath,
                'swagger.json',
            ), fs.constants.R_OK | fs.constants.F_OK);

            return true;
        } catch (e) {
            return false;
        }
    }

    existsSync() : boolean {
        try {
            fs.accessSync(path.join(
                this.distPath,
                'swagger.json',
            ), fs.constants.R_OK | fs.constants.F_OK);

            return true;
        } catch (e) {
            return false;
        }
    }
}
