/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import 'reflect-metadata';

import type { TestProject } from 'vitest/node';
import { GenericContainer } from 'testcontainers';

declare module 'vitest' {
    export interface ProvidedContext {
        OPENLDAP_CONTAINER_HOST: string
        OPENLDAP_CONTAINER_PORT: number
    }
}

async function setup(project: TestProject) {
    const containerConfig = new GenericContainer('osixia/openldap')
        .withExposedPorts(389)
        .withEnvironment({
            LDAP_ORGANISATION: 'example',
            LDAP_DOMAIN: 'example.com',
            LDAP_ADMIN_USERNAME: 'admin',
            LDAP_ADMIN_PASSWORD: 'password',
            LDAP_BASE_DN: 'dc=example,dc=com',
        });

    const container = await containerConfig.start();

    project.provide('OPENLDAP_CONTAINER_HOST', container.getHost());
    project.provide('OPENLDAP_CONTAINER_PORT', container.getFirstMappedPort());

    globalThis.OPENLDAP_CONTAINER = container;
}

async function teardown() {
    await globalThis.OPENLDAP_CONTAINER.stop();
}

export {
    setup,
    teardown,
};
