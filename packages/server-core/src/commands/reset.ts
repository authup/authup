/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { dropDatabase } from 'typeorm-extension';
import { buildDataSourceOptions } from '../database';
import type { ResetCommandContext } from './type';

export async function resetCommand(context?: ResetCommandContext) {
    context = context || {};

    if (context.logger) {
        context.logger.info('Executing database reset.');
    }

    const options = context.dataSourceOptions || await buildDataSourceOptions();
    await dropDatabase({ options });

    if (context.logger) {
        context.logger.info('Executed database reset.');
    }
}
