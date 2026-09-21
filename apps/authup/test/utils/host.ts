/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryTransport } from 'hapic';
import type { MemoryResponseInit, TransportRequest } from 'hapic';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

export async function createHostsDirectory() : Promise<string> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'authup-cli-'));
    vi.stubEnv('XDG_CONFIG_HOME', directory);

    return directory;
}

export type HostRoute = (request: TransportRequest, form: Record<string, string>) => MemoryResponseInit;

/**
 * Routes keyed `METHOD /path` (the path relative to the origin). An
 * unrouted request answers 404 so a test cannot pass on a request it never
 * expected.
 */
export function createHostTransport(routes: Record<string, HostRoute>) : MemoryTransport {
    return new MemoryTransport({
        fetch: (request) => {
            const url = new URL(request.url);
            const key = `${(request.method ?? 'GET').toUpperCase()} ${url.pathname}`;
            const route = routes[key];
            if (!route) {
                return { status: 404, body: { code: 'not_found', message: `no route for ${key}` } };
            }

            return route(request, formOf(request));
        },
    });
}

export function formOf(request: TransportRequest) : Record<string, string> {
    return Object.fromEntries(new URLSearchParams(String(request.body ?? '')));
}
