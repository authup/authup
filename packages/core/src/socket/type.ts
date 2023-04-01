/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type SocketEventContext<T extends Record<string, any>> = {
    meta: {
        roomName: string,
        roomId?: string | number
    },
    data: T
};
