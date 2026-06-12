/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RequestOptions,
    ResponseData,
    Response as ResponseInterface,
    ResponseType,
} from 'hapic';
import { Client } from '../client';
import { matchRoute } from './matcher';
import type {
    FakeClientOptions,
    FakeHandler,
    FakeHandlerMap,
    FakeRequest,
} from './types';

const defaultFallback : FakeHandler = () => ({ data: [], meta: { total: 0 } });

export class FakeClient extends Client {
    protected handlers : FakeHandlerMap;

    protected fallback : FakeHandler;

    /**
     * Every dispatched request, in order — for call-shape assertions.
     */
    public readonly requests : FakeRequest[] = [];

    constructor(options: FakeClientOptions = {}) {
        const {
            handlers, 
            fallback, 
            ...clientOptions 
        } = options;

        super({
            ...clientOptions,
            baseURL: clientOptions.baseURL ?? 'http://fake.test',
        });

        this.handlers = handlers ?? {};
        this.fallback = fallback ?? defaultFallback;
    }

    override async request<
        T = any,
        RT extends `${ResponseType}` = `${ResponseType.JSON}`,
        R = ResponseInterface<ResponseData<RT, T>>,
    >(config: RequestOptions<RT>): Promise<R> {
        const method = (config.method ?? 'GET').toUpperCase();
        const url = config.url ?? '';

        const match = matchRoute(method, url, this.handlers);
        const request : FakeRequest = {
            method,
            url,
            // token-endpoint style requests carry urlencoded bodies —
            // normalize so handler assertions see a plain object.
            body: config.body instanceof URLSearchParams ?
                Object.fromEntries(config.body) :
                config.body,
            params: match ? match.params : {},
        };
        this.requests.push(request);

        const data = match ?
            await match.handler(request) :
            await this.fallback(request);

        const response = new Response(null, {
            status: 200,
            statusText: 'OK',
        }) as ResponseInterface;
        response.data = data;

        return response as R;
    }
}

export function createFakeClient(options: FakeClientOptions = {}) : FakeClient {
    return new FakeClient(options);
}
