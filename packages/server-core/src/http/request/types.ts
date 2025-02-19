/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type RequestIdentity = {
    id: string;
    type: 'user' | 'client' | 'robot',
    clientId?: string | null,
    realmId: string,
    realmName: string
    attributes?: Record<string, any>,
};
