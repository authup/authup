#!/usr/bin/env node

/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Development-only entry point, not published as a binary.
 * Operators run the `authup` CLI.
 *
 * This file backs the `cli` and `cli-dev` package scripts, so
 * `migration generate` has a runner, and because `cli-dev` is the only
 * route to the just-in-time code-transformation gate.
 */

import 'reflect-metadata';
import { runMain } from 'citty';
import dotenv from 'dotenv';
import { createCLIEntryPointCommand } from './module.ts';

dotenv.config({
    debug: false,
    quiet: true,
});

Promise.resolve()
    .then(() => createCLIEntryPointCommand())
    .then((command) => runMain(command))
    .catch((err) => {
        console.log(err); // eslint-disable-line no-console
        process.exit(1);
    });
