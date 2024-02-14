/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

const { GenericContainer } = require('testcontainers');

module.exports = async () => {
    const containerConfig = new GenericContainer('osixia/openldap')
        .withExposedPorts(389)
        .withEnvironment({
            LDAP_ORGANISATION: 'example',
            LDAP_DOMAIN: 'example.com',
            LDAP_ADMIN_USERNAME: 'ldap',
            LDAP_ADMIN_PASSWORD: 'ldap',
            LDAP_BASE_DN: 'dc=example,dc=com',
        });

    // eslint-disable-next-line no-undef
    globalThis.OPENLDAP_CONTAINER = await containerConfig.start();
};
