/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import { FSStore } from 'confinity';
import {
    CLIENT_ADMIN_CONSOLE_PORT_DEFAULT,
    LISTEN_HOST_DEFAULT,
    SERVER_CORE_PORT_DEFAULT,
} from './constants';
import type {
    ClientAdminConsoleSectionConfig,
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

export function normalizeClientAdminConsoleSection(input: unknown) : ClientAdminConsoleSectionConfig {
    const record = toRecord(input);

    return {
        port: readPort(record),
        host: readString(record, 'host'),
        apiUrl: readString(record, 'apiUrl'),
        cookieDomain: readString(record, 'cookieDomain'),
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
    return {
        serverCore: normalizeServerCoreSection(store.getSync('server.core')),
        clientAdminConsole: normalizeClientAdminConsoleSection(store.getSync('client.admin-console')),
    };
}

export function buildServerCoreEnv(config: LauncherConfig) : Record<string, string> {
    return {
        PORT: `${config.serverCore.port ?? SERVER_CORE_PORT_DEFAULT}`,
        HOST: config.serverCore.host ?? LISTEN_HOST_DEFAULT,
    };
}

export function buildClientAdminConsoleEnv(config: LauncherConfig) : Record<string, string> {
    const env : Record<string, string> = {
        PORT: `${config.clientAdminConsole.port ?? CLIENT_ADMIN_CONSOLE_PORT_DEFAULT}`,
        HOST: config.clientAdminConsole.host ?? LISTEN_HOST_DEFAULT,
    };

    // Only override what the config actually names — with neither key set the
    // web application applies its own default.
    const apiUrl = config.clientAdminConsole.apiUrl ?? config.serverCore.publicUrl;
    if (apiUrl) {
        env.NUXT_PUBLIC_API_URL = apiUrl;
    }

    if (config.clientAdminConsole.cookieDomain) {
        env.NUXT_PUBLIC_COOKIE_DOMAIN = config.clientAdminConsole.cookieDomain;
    }

    return env;
}
