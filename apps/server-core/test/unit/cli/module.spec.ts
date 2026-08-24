/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { createCLIEntryPointCommand } from '../../../src/cli/module';

describe('src/cli/module', () => {
    it('should register the worker subcommand', async () => {
        const command = await createCLIEntryPointCommand();

        const subCommands = await (typeof command.subCommands === 'function' ?
            command.subCommands() :
            command.subCommands);

        expect(Object.keys(subCommands || {})).toEqual([
            'healthcheck',
            'migration',
            'start',
            'worker',
        ]);
    });
});
