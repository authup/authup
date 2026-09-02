/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ArgsDef, ParsedArgs } from 'citty';
import { isValidupError, stringifyPath } from 'validup';
import { describeCauseChain } from '../../utils/index.ts';
import type { ConfigReadFsOptions } from '@authup/server-config';
import type { Config } from '../../app/index.ts';
import {
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

const CLI_COMMANDS_WITHOUT_POSITIONALS = new Set(['core', 'dev', 'start']);

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
