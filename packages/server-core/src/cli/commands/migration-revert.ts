/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useLogger } from '@authup/server-kit';
import { useDataSourceOptions } from 'typeorm-extension';
import type { Arguments, Argv, CommandModule } from 'yargs';
import { DataSource } from 'typeorm';
import {
    applyConfig, buildConfig, readConfigRaw, setConfig,
} from '../../config';

import { extendDataSourceOptions } from '../../database';

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
        const raw = await readConfigRaw({
            env: true,
            fs: {
                file: args.config,
            },
        });
        const config = buildConfig(raw);
        setConfig(config);
        applyConfig(config);

        const options = await useDataSourceOptions();
        extendDataSourceOptions(options);

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        const logger = useLogger();

        try {
            await dataSource.undoLastMigration();
            // eslint-disable-next-line no-useless-catch
        } catch (e) {
            logger.error(e);
        } finally {
            await dataSource.destroy();
        }

        process.exit(0);
    }
}
