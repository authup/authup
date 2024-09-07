/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { dropDatabase, useDataSourceOptions } from 'typeorm-extension';
import { useLogger } from '@authup/server-kit';
import { extendDataSourceOptions } from '../database';

export async function executeResetCommand() {
    const logger = useLogger();

    logger.info('Executing database reset.');

    const options = await useDataSourceOptions();
    extendDataSourceOptions(options);

    await dropDatabase({ options });

    logger.info('Executed database reset.');
}
