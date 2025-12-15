/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import type { AddressInfo } from 'node:net';
import type { DataSource } from 'typeorm';
import type { IServer } from '../../src';
import { Application } from '../../src';
import { HTTPInjectionKey } from '../../src/app';

export class TestApplication extends Application {
    protected _client: Client | undefined;

    // ----------------------------------------------------

    get dataSource(): DataSource {
        return this.container.resolve('dataSource');
    }

    // ----------------------------------------------------

    get client(): Client {
        if (typeof this._client === 'undefined') {
            this._client = this.createClient();
        }

        return this._client;
    }

    protected createClient() {
        const httpServer = this.container.resolve<IServer>(HTTPInjectionKey.Server);

        const address = httpServer.address() as AddressInfo;
        const baseURL = `http://localhost:${address.port}`;

        const client = new Client({
            baseURL,
        });

        client.setAuthorizationHeader({
            type: 'Basic',
            username: 'admin',
            password: 'start123',
        });

        return client;
    }
}
