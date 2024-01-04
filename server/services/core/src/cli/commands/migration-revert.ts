/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Arguments, Argv, CommandModule } from 'yargs';
import { DataSource } from 'typeorm';
import { setupConfig } from '../../config';

import { buildDataSourceOptions } from '../../database';

interface MigrationRevertArguments extends Arguments {
    config: string | undefined;
}

export class MigrationRevertCommand implements CommandModule {
    command = 'migration:revert';

    describe = 'Revert database migration.';

    builder(args: Argv) {
        return args
            .option('config', {
                alias: 'c',
                describe: 'Path to one ore more configuration files.',
            });
    }

    async handler(args: MigrationRevertArguments) {
        await setupConfig({
            filePath: args.config,
        });

        const options = await buildDataSourceOptions();

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        try {
            await dataSource.undoLastMigration();
            // eslint-disable-next-line no-useless-catch
        } finally {
            await dataSource.destroy();
        }

        process.exit(0);
    }
}
