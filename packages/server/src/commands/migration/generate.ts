/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ora from 'ora';
import { createConnection } from 'typeorm';
import { pascalCase } from 'change-case';
import path from 'path';
import fs from 'fs';
import { buildDatabaseConnectionOptions } from '../../database';
import { MigrationGenerateCommandContext } from '../type';

export async function migrationGenerateCommand(context: MigrationGenerateCommandContext) {
    const spinner = ora.default({
        spinner: 'dots',
    });

    const connectionOptions = await buildDatabaseConnectionOptions(context.config, context.databaseConnectionMerge);

    context.name = context.name || 'Auth';

    if (!context.directory) {
        context.directory = connectionOptions.cli ?
            connectionOptions.cli.migrationsDir :
            path.join(context.config.writableDirectory, 'migrations');
    }

    const timestamp = new Date().getTime();
    const fileName = `${timestamp}-${context.name}.ts`;

    const connection = context.connection || await createConnection(connectionOptions);

    spinner.start('Generate migrations.');

    const upStatements: string[] = []; const
        downStatements: string[] = [];

    try {
        const sqlInMemory = await connection.driver.createSchemaBuilder().log();

        sqlInMemory.upQueries.forEach((upQuery) => {
            upStatements.push(`        await queryRunner.query(\`${upQuery.query.replace(/`/g, '\\`')}\`${queryParams(upQuery.parameters)});`);
        });
        sqlInMemory.downQueries.forEach((downQuery) => {
            downStatements.push(`        await queryRunner.query(\`${downQuery.query.replace(/`/g, '\\`')}\`${queryParams(downQuery.parameters)});`);
        });
    } finally {
        if (!context.connection) {
            await connection.close();
        }
    }

    if (
        upStatements.length === 0 &&
        downStatements.length === 0
    ) {
        spinner.succeed('Generated no migrations.');
    }

    const fileContent = getTemplate(context.name, timestamp, upStatements, downStatements.reverse());

    const directoryPath = path.isAbsolute(context.directory) ?
        context.directory :
        path.join(context.config.rootPath, context.directory);

    try {
        await fs.promises.access(directoryPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
        await fs.promises.mkdir(directoryPath, { recursive: true });
    }

    const filePath = path.join(directoryPath, fileName);

    await fs.promises.writeFile(filePath, fileContent, { encoding: 'utf-8' });

    spinner.succeed('Generated migrations.');
}

function queryParams(parameters: any[] | undefined): string {
    if (!parameters || !parameters.length) {
        return '';
    }

    return `, ${JSON.stringify(parameters)}`;
}

function getTemplate(
    name: string,
    timestamp: number,
    upStatements: string[],
    downStatements: string[],
): string {
    const migrationName = `${pascalCase(name)}${timestamp}`;

    return `import { MigrationInterface, QueryRunner } from 'typeorm';
export class ${migrationName} implements MigrationInterface {
    name = '${migrationName}';
    public async up(queryRunner: QueryRunner): Promise<void> {
${upStatements.join(`
`)}
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
${downStatements.join(`
`)}
    }
}
`;
}
