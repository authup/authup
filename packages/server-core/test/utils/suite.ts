/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createNodeDispatcher } from 'routup';
import { DataSource } from 'typeorm';
import {
    createDatabase, dropDatabase, setDataSource, unsetDataSource, useDataSource,
} from 'typeorm-extension';
import type { Config } from '../../src';
import {
    DatabaseSeeder, applyConfig, createRouter, extendDataSourceOptions, normalizeConfig, readConfigRawFromEnv, setConfig, setDataSourceSync,
} from '../../src';

class TestSuite {
    protected config : Config;

    protected _client : Client | undefined;

    protected _server : Server | undefined;

    protected _dataSource: DataSource | undefined;

    constructor() {
        const raw = readConfigRawFromEnv();
        const config = normalizeConfig(raw);

        config.env = 'test';
        config.middlewareRateLimit = false;
        config.middlewarePrometheus = false;
        config.middlewareSwagger = false;

        config.userAdminEnabled = true;
        config.userAuthBasic = true;

        config.robotAdminEnabled = true;

        config.redis = false;
        config.vault = false;

        setConfig(config);
        applyConfig(config);

        this.config = config;
    }

    get client() : Client {
        if (typeof this._client === 'undefined') {
            this.createClient();
        }

        return this._client;
    }

    get dataSource() : DataSource {
        if (!this._dataSource) {
            throw new Error('The test suite is not up and running.');
        }

        return this._dataSource;
    }

    async up() {
        await this.startDatabase();

        await this.startServer();
    }

    async down() {
        await this.stopDatabase();

        this.stopServer();
    }

    protected async startServer() : Promise<void> {
        const router = createRouter();
        const server = createServer(createNodeDispatcher(router));

        this._server = await new Promise<Server>((resolve, reject) => {
            const errorHandler = (err?: null | Error) => {
                reject(err);
            };

            server.once('error', errorHandler);
            server.once('listening', () => {
                server.removeListener('error', errorHandler);

                resolve(server);
            });

            server.listen();
        });
    }

    protected stopServer() {
        if (!this._server) {
            return;
        }

        this._server.close();
        this._server = undefined;
    }

    protected async startDatabase() {
        if (this._dataSource) {
            return;
        }

        const options = extendDataSourceOptions({
            type: 'better-sqlite3',
            database: ':memory:',
        });

        Object.assign(options, {
            migrations: [],
        });

        await createDatabase({ options });

        const dataSource = new DataSource(options);
        await dataSource.initialize();
        await dataSource.synchronize();

        setDataSource(dataSource);
        setDataSourceSync(dataSource);

        const core = new DatabaseSeeder(this.config);
        await core.run(dataSource);

        this._dataSource = dataSource;
    }

    protected async stopDatabase() {
        if (!this._dataSource) {
            return;
        }

        const dataSource = await useDataSource();
        await dataSource.destroy();

        const { options } = dataSource;

        unsetDataSource();

        await dropDatabase({ options });

        this._dataSource = undefined;
    }

    protected createClient() {
        if (typeof this._server === 'undefined') {
            throw new SyntaxError('The test server is not initialized.');
        }

        const address = this._server.address() as AddressInfo;
        const baseURL = `http://localhost:${address.port}`;

        const client = new Client({
            baseURL,
        });

        client.setAuthorizationHeader({
            type: 'Basic',
            username: 'admin',
            password: 'start123',
        });

        this._client = client;
    }
}

export function createTestSuite() : TestSuite {
    return new TestSuite();
}
