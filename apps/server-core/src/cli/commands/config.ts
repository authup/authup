/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ArgsDef, ParsedArgs } from 'citty';
import { defineCommand } from 'citty';
import process from 'node:process';
import { isValidupError, stringifyPath } from 'validup';
import type { ConfigReadFsOptions } from '../../app/index.ts';
import { ConfigModule, buildConfigJSONSchema, readConfig } from '../../app/index.ts';
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
    options: ConfigReadFsOptions,
    args: CLIConfigArgs,
) : ConfigReadFsOptions {
    if (args.configDirectory) {
        options.cwd = args.configDirectory;
    }

    if (args.configFile) {
        options.file = args.configFile;
    }

    return options;
}

export function createCLIConfigModule(options: ConfigReadFsOptions = {}) : ConfigModule {
    return new ConfigModule(() => readConfig({
        env: true,
        fs: options,
    }));
}

const CLI_COMMANDS_WITHOUT_POSITIONALS = new Set(['start', 'worker']);

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
 */
export function describeConfigError(error: unknown) : string {
    if (!isValidupError(error)) {
        return error instanceof Error ? error.message : String(error);
    }

    const issues = error.issues
        .map((issue) => `  ${stringifyPath(issue.path)}: ${issue.message}`)
        .join('\n');

    return `The configuration is invalid.\n${issues}`;
}

export function defineCLIConfigCommand(configFs: ConfigReadFsOptions = {}) {
    return defineCommand({
        meta: { name: 'config' },
        subCommands: {
            validate: defineCommand({
                meta: {
                    name: 'validate',
                    description: 'Read the configuration file and the environment, and report what does not hold.',
                },
                async run() {
                    try {
                        await readConfig({ env: true, fs: configFs });
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
                    console.log(JSON.stringify(buildConfigJSONSchema(), null, 4));
                },
            }),
        },
    });
}
