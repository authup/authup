#!/usr/bin/env node

import { runMain } from 'citty';
import process from 'node:process';
import { createCLIEntryPointCommand } from './module';

Promise.resolve()
    .then(() => createCLIEntryPointCommand())
    .then((command) => runMain(command))
    .catch((err) => {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    });
