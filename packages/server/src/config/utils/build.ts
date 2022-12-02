/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import {
    BaseOptions, BaseOptionsInput,
} from '../type';
import { extendCoreOptionsWithDefaults } from './defaults';
import { extractBaseOptionsFromEnv } from './env';
import { validateCoreOptionsInput } from './validate';

export function buildBaseOptions(config: BaseOptionsInput) : BaseOptions {
    return extendCoreOptionsWithDefaults(
        validateCoreOptionsInput(
            merge(
                extractBaseOptionsFromEnv(),
                {
                    env: config.env,
                    rootPath: config.rootPath,
                    writableDirectoryPath: config.writableDirectoryPath,

                    redis: config.redis,
                    smtp: config.smtp,
                },
            ),
        ),
    );
}
