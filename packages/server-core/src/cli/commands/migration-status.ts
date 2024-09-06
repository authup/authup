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

interface MigrationStatusArguments extends Arguments {
    configDirectory: string | undefined;
    configFile: string | undefined;
}

export class MigrationStatusCommand implements CommandModule {
    command = 'migration:status';

    describe = 'Status of database migrations.';

    builder(args: Argv) {
        return args
            .option('configDirectory', {
                alias: 'cD',
                describe: 'Config directory path.',
            })
            .option('configFile', {
                alias: 'cF',
                describe: 'Name of one or more configuration files.',
            });
    }

    async handler(args: MigrationStatusArguments) {
        const raw = await readConfigRaw({
            env: true,
            fs: {
                cwd: args.configDirectory,
                file: args.configFile,
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
