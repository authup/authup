#!/usr/bin/env node

import { normalizeError } from '@authup/errors';
import { runMain } from 'citty';
import consola from 'consola';
import process from 'node:process';
import { createCLIEntryPointCommand } from './module';

Promise.resolve()
    .then(() => createCLIEntryPointCommand())
    .then((command) => runMain(command))
    .catch((error) => {
        // A rejected command (unknown command, unknown package selector, ...)
        // is user error — report the message, not a stack trace.
        consola.error(normalizeError(error).message);
        process.exit(1);
    });
