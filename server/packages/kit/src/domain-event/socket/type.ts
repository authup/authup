/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DomainEventFullName,
    DomainsEventContext,
    SocketServerToClientEventContext,
} from '@authup/core';

export type SocketServerToClientEvents = {
    [K in DomainEventFullName]: (data: SocketServerToClientEventContext<DomainsEventContext>) => void
};
