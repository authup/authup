/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RootProvisioningEntity } from '../../../src';

const DATA : RootProvisioningEntity = {
    roles: [
        {
            attributes: {
                name: 'foo',
            },
            relations: {
                globalPermissions: ['foo'],
            },
        },
        {
            attributes: {
                name: 'bar',
            },
            relations: {
                globalPermissions: ['*'],
            },
        },
    ],
    permissions: [
        {
            attributes: {
                name: 'foo',
            },
        },
    ],
    scopes: [
        {
            attributes: {
                name: 'foo',
            },
        },
    ],
    realms: [
        {
            attributes: {
                name: 'foo',
            },
            relations: {
                users: [
                    {
                        attributes: {
                            name: 'foo',
                        },
                    },
                ],
                clients: [
                    {
                        attributes: {
                            name: 'foo',
                        },
                    },
                ],
                roles: [
                    {
                        attributes: {
                            name: 'foo',
                        },
                        relations: {
                            globalPermissions: ['foo'],
                        },
                    },
                    {
                        attributes: {
                            name: 'bar',
                        },
                        relations: {
                            globalPermissions: ['*'],
                        },
                    },
                ],
                permissions: [
                    {
                        attributes: {
                            name: 'foo',
                        },
                    },
                ],
            },
        },
    ],
};

export default DATA;
