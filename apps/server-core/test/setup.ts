/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import 'reflect-metadata';
import { createConnection } from 'node:net';
import { wait } from '@authup/kit';

import type { TestProject } from 'vitest/node';
import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer } from 'testcontainers';
import { ApplicationBuilder,DefaultProvisioningSource,ProvisionerModule, } from '../src/index.ts';
import { createTestDatabaseModuleForSetup } from './app/index.ts';

export type DatabaseConnectionConfig = {
    type: string,
    host: string,
    port: string,
    username: string,
    password: string,
    database: string,
};

declare module 'vitest' {
    export interface ProvidedContext {
        OPENLDAP_CONTAINER_HOST: string
        OPENLDAP_CONTAINER_PORT: number
        DATABASE_CONNECTION: DatabaseConnectionConfig | null
    }
}

type ContainerConfig = {
    image: string,
    port: number,
    environment: Record<string, string>,
};

type DatabaseContainerConfig = ContainerConfig & {
    credentials: {
        username: string,
        password: string,
        database: string,
    },
};

const DATABASE_CONTAINERS: Record<string, DatabaseContainerConfig> = {
    mysql: {
        image: 'mysql:9',
        port: 3306,
        environment: {
            MYSQL_ROOT_PASSWORD: 'start123',
        },
        credentials: {
            username: 'root',
            password: 'start123',
            database: 'app',
        },
    },
    postgres: {
        image: 'postgres:18',
        port: 5432,
        environment: {
            POSTGRES_DB: 'app',
            POSTGRES_PASSWORD: 'start123',
        },
        credentials: {
            username: 'postgres',
            password: 'start123',
            database: 'app',
        },
    },
};

const LDAP_CONTAINER: ContainerConfig = {
    image: 'osixia/openldap',
    port: 389,
    environment: {
        LDAP_ORGANISATION: 'example',
        LDAP_DOMAIN: 'example.com',
        LDAP_ADMIN_USERNAME: 'admin',
        LDAP_ADMIN_PASSWORD: 'password',
        LDAP_BASE_DN: 'dc=example,dc=com',
    },
};

const containers: StartedTestContainer[] = [];

function isReachable(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = createConnection({
            host,
            port 
        });
        const timer = setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, timeoutMs);

        socket.on('connect', () => {
            clearTimeout(timer);
            socket.destroy();
            resolve(true);
        });

        socket.on('error', () => {
            clearTimeout(timer);
            socket.destroy();
            resolve(false);
        });
    });
}

async function startContainer(config: ContainerConfig): Promise<StartedTestContainer> {
    const container = await new GenericContainer(config.image)
        .withExposedPorts(config.port)
        .withEnvironment(config.environment)
        .start();

    containers.push(container);

    return container;
}

async function setupLdap(project: TestProject) {
    const host = '127.0.0.1';

    if (await isReachable(host, LDAP_CONTAINER.port)) {
        project.provide('OPENLDAP_CONTAINER_HOST', host);
        project.provide('OPENLDAP_CONTAINER_PORT', LDAP_CONTAINER.port);
        return;
    }

    const container = await startContainer(LDAP_CONTAINER);

    project.provide('OPENLDAP_CONTAINER_HOST', container.getHost());
    project.provide('OPENLDAP_CONTAINER_PORT', container.getFirstMappedPort());
}

function buildDatabaseConnectionConfig(
    host: string,
    port: string,
    config: DatabaseContainerConfig,
): DatabaseConnectionConfig {
    return {
        type: process.env.DB_TYPE as string,
        host,
        port,
        username: config.credentials.username,
        password: config.credentials.password,
        database: config.credentials.database,
    };
}

function applyDatabaseConnectionConfig(connection: DatabaseConnectionConfig) {
    process.env.DB_TYPE = connection.type;
    process.env.DB_HOST = connection.host;
    process.env.DB_PORT = connection.port;
    process.env.DB_USERNAME = connection.username;
    process.env.DB_PASSWORD = connection.password;
    process.env.DB_DATABASE = connection.database;
}

async function setupDatabase(project: TestProject) {
    const dbType = process.env.DB_TYPE;
    if (!dbType || dbType === 'better-sqlite3' || dbType === 'sqlite') {
        project.provide('DATABASE_CONNECTION', null);
        return;
    }

    const config = DATABASE_CONTAINERS[dbType];
    if (!config) {
        project.provide('DATABASE_CONNECTION', null);
        return;
    }

    if (process.env.DB_HOST) {
        const connection = buildDatabaseConnectionConfig(
            process.env.DB_HOST,
            process.env.DB_PORT || String(config.port),
            config,
        );
        project.provide('DATABASE_CONNECTION', connection);
        return;
    }

    const container = await startContainer(config);

    const connection = buildDatabaseConnectionConfig(
        container.getHost(),
        String(container.getFirstMappedPort()),
        config,
    );

    applyDatabaseConnectionConfig(connection);
    project.provide('DATABASE_CONNECTION', connection);
}

async function setup(project: TestProject) {
    await Promise.all([
        setupLdap(project),
        setupDatabase(project),
    ]);

    const app = new ApplicationBuilder()
        .withConfig()
        .withLogger()
        .withDatabase(createTestDatabaseModuleForSetup())
        .withProvisioning(new ProvisionerModule([
            new DefaultProvisioningSource(),
        ]))
        .build();

    await app.setup();
    await app.teardown();

    await wait(0);
}

async function teardown() {
    await Promise.all(containers.map((c) => c.stop()));
}

export {
    setup,
    teardown,
};
