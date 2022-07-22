/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Logger, useConfig } from '../../../config';
import { isRedisEnabled } from '../../../utils';
import { cleanUp } from './utils';
import { runOAuth2CleanerInInterval } from './interval';
import { runOAuth2CleanerByEvent } from './event';

export async function runOAuth2Cleaner(logger?: Logger) {
    await cleanUp(logger);

    const config = await useConfig();
    if (isRedisEnabled(config.redis)) {
        await runOAuth2CleanerByEvent(logger);
    } else {
        await runOAuth2CleanerInInterval(logger);
    }
}
