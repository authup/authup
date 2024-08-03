/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Socket } from 'socket.io-client';
import { Manager } from 'socket.io-client';
import type { CTSEvents, DefaultEvents, STCEvents } from '../../types';
import type { ClientManagerContext, ClientManagerTokenFn } from './types';
import { isDisconnectDescription, toClientManagerTokenAsyncFn } from './utils';

export class ClientManager<
    ListenEvents extends DefaultEvents = STCEvents,
    EmitEvents extends DefaultEvents = CTSEvents,
> {
    protected manager : Manager<ListenEvents, EmitEvents>;

    protected sockets: Map<string, Socket<ListenEvents, EmitEvents>>;

    protected tokenFn : ClientManagerTokenFn;

    constructor(ctx: ClientManagerContext) {
        this.sockets = new Map();

        this.manager = new Manager(ctx.url, {
            autoConnect: false,
            reconnectionAttempts: 10,
            ...ctx.options,
        });

        this.tokenFn = toClientManagerTokenAsyncFn(ctx.token);
    }

    async connect(namespace = '/') : Promise<Socket<ListenEvents, EmitEvents>> {
        const socket = this.inject(namespace);
        if (socket.connected) {
            return socket;
        }

        return new Promise((resolve, reject) => {
            socket.once('connect', () => {
                resolve(socket);
            });

            socket.once('connect_error', (err) => {
                reject(err);
            });

            socket.connect();
        });
    }

    async disconnect(namespace = '/') : Promise<void> {
        const socket = this.inject(namespace);
        if (!socket.connected) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            socket.once('disconnect', (
                reason,
                description,
            ) => {
                if (reason === 'io client disconnect') {
                    resolve();
                    return;
                }

                if (isDisconnectDescription(description)) {
                    reject(new Error(description.description));
                    return;
                }

                reject(description);
            });

            socket.disconnect();
        });
    }

    async reconnect(namespace = '/') : Promise<Socket<ListenEvents, EmitEvents>> {
        await this.disconnect(namespace);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.connect(namespace)
                    .then((socket) => resolve(socket))
                    .catch((err) => reject(err));
            });
        });
    }

    async reconnectAll() : Promise<Socket<ListenEvents, EmitEvents>[]> {
        const keys = this.sockets.keys();
        const promises : Promise<Socket<ListenEvents, EmitEvents>>[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const key = keys.next();
            if (key.done) {
                break;
            }

            promises.push(this.reconnect(key.value));
        }

        return Promise.all(promises);
    }

    inject(namespace = '/') : Socket<ListenEvents, EmitEvents> {
        if (this.sockets.has(namespace)) {
            return this.sockets.get(namespace);
        }

        const socket = this.manager.socket(namespace, {
            auth: (cb: CallableFunction) => {
                Promise.resolve()
                    .then(() => this.tokenFn())
                    .then((token) => {
                        cb({ token });
                    })
                    .catch(() => cb());
            },
        });

        this.sockets.set(namespace, socket);

        return socket;
    }

    eject(namespace = '/') {
        if (this.sockets[namespace]) {
            this.sockets[namespace].disconnect();
            delete this.sockets[namespace];
        }
    }
}
