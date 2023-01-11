/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { pascalCase } from 'pascal-case';
import path from 'path';
import fs from 'fs';
import process from 'process';
import { MigrationGenerateCommand } from 'typeorm/commands/MigrationGenerateCommand';
import { MigrationGenerateCommandContext } from './type';

class GenerateCommand extends MigrationGenerateCommand {
    static prettify(query: string) {
        return this.prettifyQuery(query);
    }
}

export async function generateMigration(context: MigrationGenerateCommandContext) {
    if (!path.isAbsolute(context.directoryPath)) {
        context.directoryPath = path.join(process.cwd(), context.directoryPath);
    }

    context.name = context.name || 'Default';

    const timestamp = context.timestamp || new Date().getTime();
    const fileName = `${timestamp}-${context.name}.ts`;

    const { dataSource } = context;

    const upStatements: string[] = []; const
        downStatements: string[] = [];

    try {
        const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

        sqlInMemory.upQueries.forEach((upQuery) => {
            upQuery.query = GenerateCommand.prettify(
                upQuery.query,
            );
        });
        sqlInMemory.downQueries.forEach((downQuery) => {
            downQuery.query = GenerateCommand.prettify(
                downQuery.query,
            );
        });

        sqlInMemory.upQueries.forEach((upQuery) => {
            upStatements.push(`        await queryRunner.query(\`${upQuery.query.replace(/`/g, '\\`')}\`${queryParams(upQuery.parameters)});`);
        });

        sqlInMemory.downQueries.forEach((downQuery) => {
            downStatements.push(`        await queryRunner.query(\`${downQuery.query.replace(/`/g, '\\`')}\`${queryParams(downQuery.parameters)});`);
        });
    } finally {
        if (!context.dataSource) {
            await dataSource.destroy();
        }
    }

    if (
        upStatements.length === 0 &&
        downStatements.length === 0
    ) {
        return;
    }

    const fileContent = getTemplate(context.name, timestamp, upStatements, downStatements.reverse());

    try {
        await fs.promises.access(context.directoryPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
        await fs.promises.mkdir(context.directoryPath, { recursive: true });
    }

    const filePath = path.join(context.directoryPath, fileName);

    await fs.promises.writeFile(filePath, fileContent, { encoding: 'utf-8' });
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
