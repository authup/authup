/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { dropDatabase } from 'typeorm-extension';
import { buildDataSourceOptions } from '../database';
import { StartCommandContext } from './type';
import { setConfig, useConfig } from '../config';

export async function resetCommand(context?: StartCommandContext) {
    context = context || {};

    if (context.spinner) {
        context.spinner.start('Executing database reset.');
    }

    const options = await buildDataSourceOptions();
    await dropDatabase({ options });
    if (context.spinner) {
        context.spinner.succeed('Executed database reset.');
    }
}
