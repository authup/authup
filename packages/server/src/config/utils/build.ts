/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    BaseOptions, BaseOptionsInput,
} from '../type';
import { extendCoreOptionsWithDefaults } from './defaults';
import { validateBaseOptionsInput } from './validate';

export function buildBaseOptions(config: BaseOptionsInput) : BaseOptions {
    return extendCoreOptionsWithDefaults(
        validateBaseOptionsInput(
            {
                env: config.env,
                rootPath: config.rootPath,
                writableDirectoryPath: config.writableDirectoryPath,

                redis: config.redis,
                smtp: config.smtp,
            },
        ),
    );
}
