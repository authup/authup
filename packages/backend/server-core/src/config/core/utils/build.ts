/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import defu from 'defu';
import { CoreOptions, CoreOptionsInput } from '../type';
import { extendCoreOptionsWithDefaults } from './defaults';
import { extractCoreOptionsFromEnv } from './env';
import { validateCoreOptionsInput } from './validate';

export function buildCoreOptions(config: CoreOptionsInput) : CoreOptions {
    return extendCoreOptionsWithDefaults(
        validateCoreOptionsInput(
            defu(
                extractCoreOptionsFromEnv(),
                {
                    env: config.env,
                    port: config.port,
                    selfUrl: config.selfUrl,
                    webUrl: config.webUrl,
                    rootPath: config.rootPath,
                    writableDirectoryPath: config.writableDirectoryPath,
                    tokenMaxAgeAccessToken: config.tokenMaxAgeAccessToken,
                    tokenMaxAgeRefreshToken: config.tokenMaxAgeRefreshToken,

                    redis: config.redis,
                    smtp: config.smtp,

                    registration: config.registration,
                    emailVerification: config.emailVerification,
                    forgotPassword: config.forgotPassword,
                },
            ),
        ),
    );
}
