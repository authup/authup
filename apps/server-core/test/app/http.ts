/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import type { HTTPServer } from '../../src/app';
import { HTTPInjectionKey } from '../../src/app';
import { TestApplication } from './module.ts';

export class TestHTTPApplication extends TestApplication {
    protected _client: Client | undefined;

    // ----------------------------------------------------

    get client(): Client {
        if (typeof this._client === 'undefined') {
            this._client = this.createClient();
        }

        return this._client;
    }

    get baseURL(): string {
        const httpServer = this.container.resolve<HTTPServer>(HTTPInjectionKey.Server);
        if (!httpServer.url) {
            throw new Error('HTTP server has no URL — was it started?');
        }
        return httpServer.url.replace(/\/$/, '');
    }

    protected createClient() {
        const client = new Client({ baseURL: this.baseURL });

        client.setAuthorizationHeader({
            type: 'Basic',
            username: 'admin',
            password: 'start123',
        });

        return client;
    }
}
