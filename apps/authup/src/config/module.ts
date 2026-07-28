/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { API_URL_DEFAULT } from '@authup/kit';
import { Container } from 'confinity';
import type {
    ClientWebSectionConfig,
    LauncherConfig,
    LauncherConfigReadOptions,
    ServerCoreSectionConfig,
} from './types';

function toRecord(input: unknown) : Record<string, unknown> {
    if (
        typeof input === 'object' &&
        input !== null &&
        !Array.isArray(input)
    ) {
        return input as Record<string, unknown>;
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

export function normalizeClientWebSection(input: unknown) : ClientWebSectionConfig {
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
    const container = new Container({
        prefix: 'authup',
        cwd: options.directory,
    });

    if (options.file) {
        await container.loadFile(options.file);
    } else {
        await container.load();
    }

    return {
        serverCore: normalizeServerCoreSection(container.get('server.core')),
        clientWeb: normalizeClientWebSection(container.get('client.web')),
    };
}

export function buildServerCoreEnv(config: LauncherConfig) : Record<string, string> {
    const env : Record<string, string> = {};

    if (typeof config.serverCore.port !== 'undefined') {
        env.PORT = `${config.serverCore.port}`;
    }

    if (config.serverCore.host) {
        env.HOST = config.serverCore.host;
    }

    return env;
}

export function buildClientWebEnv(config: LauncherConfig) : Record<string, string> {
    const env : Record<string, string> = {};

    if (typeof config.clientWeb.port !== 'undefined') {
        env.PORT = `${config.clientWeb.port}`;
    }

    if (config.clientWeb.host) {
        env.HOST = config.clientWeb.host;
    }

    env.NUXT_PUBLIC_API_URL = config.clientWeb.apiUrl ??
        config.serverCore.publicUrl ??
        API_URL_DEFAULT;

    if (config.clientWeb.cookieDomain) {
        env.NUXT_PUBLIC_COOKIE_DOMAIN = config.clientWeb.cookieDomain;
    }

    return env;
}
