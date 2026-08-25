/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import type { Config, ConfigReadFsOptions } from '../../app/index.ts';
import { createConsoleApplication } from '../../app/index.ts';
import { CLI_CONFIG_ARGS, createCLIConfigModule } from '../config.ts';
import type { CLIConsoleSelector } from '../types.ts';
import { registerShutdownHandlers } from './shutdown.ts';

/**
 * The consoles a `console` process can be told to serve. `auth` is not one of
 * them: the auth pages are the identity provider's own surface and ride every
 * role, so naming it is refused rather than ignored.
 */
export const CLI_CONSOLE_SELECTORS : readonly CLIConsoleSelector[] = ['admin', 'account'];

const CLI_CONSOLE_SELECTOR_AUTH = 'auth';

/**
 * Map the positionals of `authup-server console [admin|account ...]` onto
 * the two console flags. The positionals are sugar over the configuration:
 * a named console is forced on and every unnamed one off, the way `worker`
 * forces the components on; no name at all leaves both as configured.
 */
export function resolveCLIConsoleSelection(
    positionals: string[],
) : Partial<Pick<Config, 'adminConsoleEnabled' | 'accountConsoleEnabled'>> {
    if (positionals.length === 0) {
        return {};
    }

    const selected = new Set<CLIConsoleSelector>();

    for (const positional of positionals) {
        if (positional === CLI_CONSOLE_SELECTOR_AUTH) {
            throw new Error(
                '"auth" is not a console selector: the auth pages (/authorize, /logout and the workflow pages) ' +
                'are the identity provider\'s issuance surface and are served by every role, this one included.',
            );
        }

        if (!isCLIConsoleSelector(positional)) {
            throw new Error(`Unknown console "${positional}". Expected one of: ${CLI_CONSOLE_SELECTORS.join(', ')}.`);
        }

        selected.add(positional);
    }

    return {
        adminConsoleEnabled: selected.has('admin'),
        accountConsoleEnabled: selected.has('account'),
    };
}

function isCLIConsoleSelector(input: string) : input is CLIConsoleSelector {
    return (CLI_CONSOLE_SELECTORS as readonly string[]).includes(input);
}

export function defineCLIConsoleCommand(configFs: ConfigReadFsOptions = {}) {
    return defineCommand({
        meta: {
            name: 'console',
            description: 'Serve the consoles without the management API. Optional positionals name the consoles to serve: admin, account (both as configured when omitted).',
        },
        // Declared here as well as on the root command: citty re-parses the
        // tail after the subcommand name against THIS arg list, so without
        // the declaration `console admin --configDirectory <path>` would land
        // `<path>` among the positionals and refuse it as an unknown console.
        args: CLI_CONFIG_ARGS,
        async setup(context) {
            const selection = resolveCLIConsoleSelection(context.args._);

            const app = createConsoleApplication({ config: createCLIConfigModule(configFs, selection) });

            await app.setup();

            registerShutdownHandlers(app);
        },
    });
}
