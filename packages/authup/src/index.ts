/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import cac from 'cac';

const cli = cac();

cli.command('server <command>', 'Run a backend command')
    .action(async (command: string) => {

    });

cli.command('ui <command>', 'Run a frontend command')
    .action(async (command) => {

    });

cli.help();

cli.parse();
