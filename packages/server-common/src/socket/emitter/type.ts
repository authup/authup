/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SocketEventName, SocketServerToClientData } from '@authup/common';

export type SocketEmitterEventDestination = {
    namespace?: string,
    roomNameFn: (id?: string | number) => string
};

export type SocketEmitterEventContext<EventName extends SocketEventName> = {
    destinations: SocketEmitterEventDestination[],
    operation: EventName,
    data: SocketServerToClientData<EventName>
};
