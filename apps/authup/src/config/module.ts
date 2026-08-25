/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import { FSStore } from 'confinity';
import { ADMIN_CONSOLE_SECTION_WARNING } from '../packages/constants';
import { LISTEN_HOST_DEFAULT, SERVER_CORE_PORT_DEFAULT } from './constants';
import type {
    LauncherConfig,
    LauncherConfigReadOptions,
    ServerCoreSectionConfig,
} from './types';

function toRecord(input: unknown) : Record<string, unknown> {
    if (isObject(input)) {
        return input;
    }

    return {};
}

function readPort(input: Record<string, unknown>) : number | undefined {
    const value = input.port;

    if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0
    ) {
        return value;
    }

    if (typeof value === 'string' && value.length > 0) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) {
            return parsed;
        }
    }

    return undefined;
}

function readString(input: Record<string, unknown>, key: string) : string | undefined {
    const value = input[key];
    if (typeof value === 'string' && value.length > 0) {
        return value;
    }

    return undefined;
}

export function normalizeServerCoreSection(input: unknown) : ServerCoreSectionConfig {
    const record = toRecord(input);

    return {
        port: readPort(record),
        host: readString(record, 'host'),
        publicUrl: readString(record, 'publicUrl'),
    };
}

export async function readLauncherConfig(
    options: LauncherConfigReadOptions = {},
) : Promise<LauncherConfig> {
    const store = new FSStore({
        prefix: 'authup',
        cwd: options.directory,
    });

    if (options.file) {
        await store.loadFile(options.file);
    } else {
        await store.load();
    }

    // `getSync` after the explicit load, not `get`. In confinity v2 `get` is
    // asynchronous, and both normalizers take `unknown` — so a missing `await`
    // would compile cleanly, hand them a Promise, and silently start every
    // service on its defaults.
    const warnings : string[] = [];

    // Read but not honoured (plan 081): a stale section must be parsed and
    // warned about, never silently defaulted, the `client.web` lesson.
    if (Object.keys(toRecord(store.getSync('client.admin-console'))).length > 0) {
        warnings.push(ADMIN_CONSOLE_SECTION_WARNING);
    }

    return {
        serverCore: normalizeServerCoreSection(store.getSync('server.core')),
        warnings,
    };
}

export function buildServerCoreEnv(config: LauncherConfig) : Record<string, string> {
    return {
        PORT: `${config.serverCore.port ?? SERVER_CORE_PORT_DEFAULT}`,
        HOST: config.serverCore.host ?? LISTEN_HOST_DEFAULT,
    };
}

