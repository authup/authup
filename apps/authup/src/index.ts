#!/usr/bin/env node

import { runMain } from 'citty';
import { createCLIEntryPointCommand } from './module';

Promise.resolve()
    .then(() => createCLIEntryPointCommand())
    .then((command) => runMain(command));
