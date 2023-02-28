/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { IncomingHttpHeaders } from 'http';
import type { VerifyContext } from '../../type';
import type { RequestEnv } from '../http';

export type SocketMiddlewareContext = VerifyContext;
export type SocketNextFunction = (err?: Error) => void;
export type SocketData = RequestEnv & {
    [k: string]: any
};
export type Socket = {
    data: Partial<SocketData>,

    handshake: Handshake,

    [key: string]: any
};

export interface Handshake {
    /**
     * The headers sent as part of the handshake
     */
    headers: IncomingHttpHeaders;
    /**
     * The date of creation (as string)
     */
    time: string;
    /**
     * The ip of the client
     */
    address: string;
    /**
     * Whether the connection is cross-domain
     */
    xdomain: boolean;
    /**
     * Whether the connection is secure
     */
    secure: boolean;
    /**
     * The date of creation (as unix timestamp)
     */
    issued: number;
    /**
     * The request URL string
     */
    url: string;
    /**
     * The query object
     */
    query: Record<string, any>;
    /**
     * The auth object
     */
    auth: {
        [key: string]: any;
    };
}
