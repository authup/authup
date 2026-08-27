/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CONFIG_SCHEMA as DOCUMENT_CONFIG_SCHEMA, inspectConfigFile, readConfigFileTree } from '@authup/server-config';
import {
    buildSchemaJSONSchema,
    mountSchema,
    readSchemaFromEnv,
    readSchemaFromFileTree,
} from '@authup/server-config-kit';
import type { ArgsDef, ParsedArgs } from 'citty';
import { defineCommand } from 'citty';
import process from 'node:process';
import { Container, isValidupError, stringifyPath } from 'validup';
import { describeCauseChain } from '../../utils/index.ts';
import type { ConfigReadFsOptions } from '@authup/server-config';
import type { Config } from '../../app/index.ts';
import {
    CONFIG_SCHEMA,
    ConfigModule,
    readConfig,
} from '../../app/index.ts';
import type { CLIConfigArgs } from './types.ts';

export const CLI_CONFIG_ARGS = {
    configDirectory: {
        type: 'string',
        description: 'Config directory path',
    },
    configFile: {
        type: 'string',
        description: 'Name of one or more configuration files.',
    },
} satisfies ArgsDef;

export function applyCLIConfigArgs(
    options: ConfigReadFsOptions<Config>,
    args: CLIConfigArgs,
) : ConfigReadFsOptions<Config> {
    if (args.configDirectory) {
        options.cwd = args.configDirectory;
    }

    if (args.configFile) {
        options.file = args.configFile;
    }

    return options;
}

export function createCLIConfigModule(options: ConfigReadFsOptions<Config> = {}) : ConfigModule {
    return new ConfigModule(() => readConfig({
        env: true,
        fs: options,
    }));
}

const CLI_COMMANDS_WITHOUT_POSITIONALS = new Set(['core', 'start', 'worker']);

export function assertNoStrayPositionals(args: Pick<ParsedArgs, '_'>) : void {
    const [command, ...rest] = args._;

    if (!command || !CLI_COMMANDS_WITHOUT_POSITIONALS.has(command) || rest.length === 0) {
        return;
    }

    throw new Error(`Unexpected argument "${rest[0]}" for command "${command}".`);
}

/**
 * The raw ValidupError message is a generic "Property <path> is invalid" and
 * names no reason, so every issue is rendered instead. Same shape as the
 * provisioning file loader.
 *
 * Anything else is rendered with its cause chain: confinity wraps a parse
 * failure so that the file is always named, which leaves the reason (the line
 * and column a YAML parser reports) one level down. The stack is deliberately
 * left out, unlike the log-side describeError.
 */
export function describeConfigError(error: unknown) : string {
    if (isValidupError(error)) {
        const issues = error.issues
            .map((issue) => `  ${stringifyPath(issue.path)}: ${issue.message}`)
            .join('\n');

        return `The configuration is invalid.\n${issues}`;
    }

    const message = error instanceof Error ? error.message : String(error);

    const causes = describeCauseChain(error);

    return causes ? `${message}\n  cause: ${causes}` : message;
}

/**
 * Check every key of the document against the zod type its one declaration
 * carries, not just the ones this service reads: an operator writing a
 * console service's section is configuring the same file, and a value that
 * service will reject has to be reported here.
 */
async function validateDocument(input: Record<string, unknown>) : Promise<void> {
    const container = new Container<Record<string, unknown>>();
    mountSchema(container, DOCUMENT_CONFIG_SCHEMA);

    await container.run(input);
}

export function defineCLIConfigCommand(
    configFs: ConfigReadFsOptions<Config> = {},
) {
    return defineCommand({
        meta: {
            name: 'config',
            description: 'Inspect the configuration the service would read.',
        },
        subCommands: {
            validate: defineCommand({
                meta: {
                    name: 'validate',
                    description: 'Read the configuration file and the environment, and report what does not hold.',
                },
                async run() {
                    try {
                        // The file itself first: what it holds that nothing
                        // reads, and whether it was found at all. The read
                        // below reports neither, because it skips what it does
                        // not claim and an absent file is a valid deployment.
                        const { files, unknown } = await inspectConfigFile(configFs);

                        if (files.length === 0 && (configFs.cwd || configFs.file)) {
                            // Named a place and nothing was there: reporting
                            // the environment as valid would answer a question
                            // the operator did not ask.
                            // eslint-disable-next-line no-console
                            console.error(`No configuration file was found in ${configFs.cwd || process.cwd()}.`);
                            process.exit(1);
                        }

                        if (unknown.length > 0) {
                            const paths = unknown.map((entry) => `  ${entry}`).join('\n');

                            // eslint-disable-next-line no-console
                            console.error(`The configuration file holds options that are not read.\n${paths}`);
                            process.exit(1);
                        }

                        await readConfig({ env: true, fs: configFs });

                        // and then every key of the document, including the
                        // ones only another service reads. The read above
                        // covers this service's selection alone.
                        const { tree } = await readConfigFileTree(configFs);
                        await validateDocument({
                            ...readSchemaFromFileTree(tree, DOCUMENT_CONFIG_SCHEMA),
                            ...readSchemaFromEnv(DOCUMENT_CONFIG_SCHEMA),
                        });
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.error(describeConfigError(e));
                        process.exit(1);
                    }
                },
            }),
            schema: defineCommand({
                meta: {
                    name: 'schema',
                    description: 'Print the JSON Schema of the configuration file.',
                },
                run() {
                    // eslint-disable-next-line no-console
                    console.log(
                        JSON.stringify(
                            buildSchemaJSONSchema(
                                CONFIG_SCHEMA,
                                { title: 'Core' },
                            ),
                            null,
                            4,
                        ),
                    );
                },
            }),
        },
    });
}
