/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RootProvisioningEntity } from '../../../src';

const DATA : RootProvisioningEntity = {
    policies: [
        {
            attributes: {
                name: 'file-policy',
                type: 'composite',
                builtIn: true,
            },
            children: [
                {
                    attributes: {
                        name: 'file-policy-child',
                        type: 'identity',
                        builtIn: true,
                    },
                },
            ],
        },
    ],
    roles: [
        {
            attributes: { name: 'foo' },
            relations: { globalPermissions: ['foo'] },
        },
        {
            attributes: { name: 'bar', builtIn: true },
            relations: { globalPermissions: ['*'] },
        },
    ],
    permissions: [
        {
            attributes: { name: 'foo' },
            relations: { policies: ['file-policy'] },
        },
    ],
    scopes: [
        { attributes: { name: 'foo' } },
    ],
    realms: [
        {
            attributes: { name: 'foo' },
            relations: {
                users: [
                    { attributes: { name: 'foo' } },
                ],
                clients: [
                    {
                        attributes: { name: 'foo' },
                        relations: {
                            globalScopes: ['foo'],
                            realmScopes: ['realm-scope'],
                        },
                    },
                ],
                scopes: [
                    { attributes: { name: 'realm-scope' } },
                ],
                roles: [
                    {
                        attributes: { name: 'foo' },
                        relations: { globalPermissions: ['foo'] },
                    },
                    {
                        attributes: { name: 'bar' },
                        relations: { globalPermissions: ['*'] },
                    },
                ],
                permissions: [
                    { attributes: { name: 'foo' } },
                ],
            },
        },
    ],
};

export default DATA;
