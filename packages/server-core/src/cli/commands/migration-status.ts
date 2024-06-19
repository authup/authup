/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useLogger } from '@authup/server-kit';
import type { Arguments, Argv, CommandModule } from 'yargs';
import { DataSource } from 'typeorm';
import { setupConfig, setupLogger } from '../../config';

import { buildDataSourceOptions } from '../../database';

interface MigrationStatusArguments extends Arguments {
    config: string | undefined;
}

export class MigrationStatusCommand implements CommandModule {
    command = 'migration:status';

    describe = 'Status of database migrations.';

    builder(args: Argv) {
        return args
            .option('config', {
                alias: 'c',
                describe: 'Path to one ore more configuration files.',
            });
    }

    async handler(args: MigrationStatusArguments) {
        const config = await setupConfig({
            filePath: args.config,
        });

        setupLogger({
            directory: config.writableDirectoryPath,
            env: config.env,
        });

        const options = await buildDataSourceOptions();

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        const logger = useLogger();

        try {
            await dataSource.showMigrations();
            // eslint-disable-next-line no-useless-catch
        } catch (e) {
            logger.error(e);
        } finally {
            await dataSource.destroy();
        }

        process.exit(0);
    }
}
