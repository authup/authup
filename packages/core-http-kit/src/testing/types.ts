/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientOptions } from '../client';

export type FakeRequest = {
    method: string,
    url: string,
    body?: unknown,
    params: Record<string, string>,
};

export type FakeHandler = (req: FakeRequest) => unknown | Promise<unknown>;

/**
 * Keys are either 'METHOD path' patterns ('GET /clients/:id') or
 * the '*' catch-all. Path segments starting with ':' capture into
 * the handler's req.params.
 */
export type FakeHandlerMap = Record<string, FakeHandler>;

export type FakeClientOptions = ClientOptions & {
    handlers?: FakeHandlerMap,
    /**
     * Invoked when no handler matches.
     * Default: () => ({ data: [], meta: { total: 0 } })
     */
    fallback?: FakeHandler,
};
