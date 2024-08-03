/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { ClientManager } from '../../src';
import type { CTSEvents, STCEvents, STSEvents } from '../../src';

describe('src/manager', () => {
    let server : Server<CTSEvents, STCEvents, STSEvents>;
    let port : number;

    beforeAll((done) => {
        const httpServer = createServer();
        server = new Server(httpServer);
        server.use((socket, next) => {
            setTimeout(() => {
                socket.emit('token', socket.handshake.auth.token);
            });

            next();
        });
        httpServer.listen(() => {
            port = (httpServer.address() as AddressInfo).port;
            done();
        });
    });

    afterAll(() => {
        server.close();
    });

    it('should connect to server', async () => {
        const manager = new ClientManager({
            url: `http://localhost:${port}`,
        });
        const socket = await manager.connect();
        expect(socket.connected).toBeTruthy();

        await manager.disconnect();
        expect(socket.connected).toBeFalsy();
    });

    it('should inject and eject', () => {
        const manager = new ClientManager({
            url: `http://localhost:${port}`,
        });
        const socket = manager.inject();
        expect(socket.connected).toBeFalsy();

        manager.eject();
    });

    it('should reconnect', async () => {
        const manager = new ClientManager({
            url: `http://localhost:${port}`,
        });

        const socket = await manager.connect();
        expect(socket.connected).toBeTruthy();

        socket.disconnect();
        expect(socket.connected).toBeFalsy();

        await manager.reconnectAll();

        expect(socket.connected).toBeTruthy();
        socket.disconnect();
    });

    it('should connect with token', (done) => {
        const manager = new ClientManager({
            url: `http://localhost:${port}`,
            token: () => Promise.resolve('foo-bar-baz'),
        });

        expect.assertions(1);

        Promise.resolve()
            .then(() => manager.connect())
            .then((socket) => {
                socket.on('token', (token) => {
                    expect(token).toEqual('foo-bar-baz');
                    socket.disconnect();

                    done();
                });
            });
    });
});
