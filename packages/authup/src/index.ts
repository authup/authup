#!/usr/bin/env node

/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runMain } from 'citty';
import { createCLIEntryPointCommand } from './module';

Promise.resolve()
    .then(() => createCLIEntryPointCommand())
    .then((command) => runMain(command));
