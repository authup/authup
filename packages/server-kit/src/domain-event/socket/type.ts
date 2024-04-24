/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DomainEventFullName,
    DomainsEventContext,
} from '@authup/core-kit';
import type { STCEventContext } from '@authup/core-realtime-kit';

export type SocketServerToClientEvents = {
    [K in DomainEventFullName]: (data: STCEventContext<DomainsEventContext>) => void
};
