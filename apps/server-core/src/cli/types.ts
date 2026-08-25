/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type CLIConfigArgs = {
    configDirectory?: string,
    configFile?: string,
};

/**
 * A console the `console` command can be told to serve. The auth console is
 * deliberately absent: its pages are the issuance surface, not a console.
 */
export type CLIConsoleSelector = 'admin' | 'account';
