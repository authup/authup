/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { composeSchemas } from '@authup/server-config-kit';
import { CONFIG_SCHEMA, CONFIG_SECTION } from '@authup/server-core';
import { describe, expect, it } from 'vitest';
import { createCLIEntryPointCommand } from '../../src/module.ts';
import { CONSOLE_CONFIG_SCHEMAS } from '../../src/roles/config.ts';

type EntryPointCommand = Awaited<ReturnType<typeof createCLIEntryPointCommand>>;

function createSetupContext(command: EntryPointCommand, positionals: string[]) {
    return {
        rawArgs: positionals,
        args: {
            _: positionals,
            configDirectory: '',
            configFile: '',
        },
        cmd: command,
    };
}

describe('createCLIEntryPointCommand', () => {
    it('carries the authup meta and every role command', async () => {
        const command = await createCLIEntryPointCommand();
        expect(command.meta).toMatchObject({ name: 'authup' });
        expect(Object.keys(command.subCommands ?? {}).sort())
            .toEqual(['config', 'console', 'core', 'healthcheck', 'migration', 'start', 'worker']);
    });

    it('refuses stray positionals on the listener roles but not on migration or console', async () => {
        const command = await createCLIEntryPointCommand();

        expect(() => command.setup?.(createSetupContext(command, ['start', 'server.core'])))
            .toThrow(/Unexpected argument/);
        expect(() => command.setup?.(createSetupContext(command, ['worker', 'server.core'])))
            .toThrow(/Unexpected argument/);
        expect(() => command.setup?.(createSetupContext(command, ['core', 'server.core'])))
            .toThrow(/Unexpected argument/);
        expect(() => command.setup?.(createSetupContext(command, ['migration', 'run'])))
            .not.toThrow();
        expect(() => command.setup?.(createSetupContext(command, ['console', 'admin'])))
            .not.toThrow();
    });
});

/**
 * The four registries describe one document, and three keys are declared by
 * more than one of them (`publicUrl`, the theme pair, each console's url and
 * enabled flag). Nothing imports across the package boundary to keep those in
 * step, so the composer's agreement rule is what does; it is a static
 * authoring property, so this is where it belongs rather than at boot.
 */
describe('the composed configuration schema', () => {
    it('holds no key two packages declare differently', () => {
        expect(() => composeSchemas([
            { prefix: CONFIG_SECTION, schema: CONFIG_SCHEMA },
            ...CONSOLE_CONFIG_SCHEMAS,
        ])).not.toThrow();
    });
});
