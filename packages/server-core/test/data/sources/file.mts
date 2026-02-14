/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RootProvisioningData } from '../../../src';

const DATA : RootProvisioningData = {
    roles: [
        {
            data: {
                name: 'foo',
            },
            relations: {
                globalPermissions: ['foo'],
            },
        },
        {
            data: {
                name: 'bar',
            },
            relations: {
                globalPermissions: ['*'],
            },
        },
    ],
    permissions: [
        {
            data: {
                name: 'foo',
            },
        },
    ],
    scopes: [
        {
            data: {
                name: 'foo',
            },
        },
    ],
    realms: [
        {
            data: {
                name: 'foo',
            },
            relations: {
                users: [
                    {
                        data: {
                            name: 'foo',
                        },
                    },
                ],
                clients: [
                    {
                        data: {
                            name: 'foo',
                        },
                    },
                ],
                roles: [
                    {
                        data: {
                            name: 'foo',
                        },
                        relations: {
                            globalPermissions: ['foo'],
                        },
                    },
                    {
                        data: {
                            name: 'bar',
                        },
                        relations: {
                            globalPermissions: ['*'],
                        },
                    },
                ],
                permissions: [
                    {
                        data: {
                            name: 'foo',
                        },
                    },
                ],
            },
        },
    ],
};

export default DATA;
