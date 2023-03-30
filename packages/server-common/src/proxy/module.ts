/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import http from 'node:http';
import type { AgentOptions } from 'node:https';
import https from 'node:https';

export type ProxyClientOptions = {
    user?: string,
    password?: string,
    host: string,
    port: number
};

export class ProxyClient {
    protected options: ProxyClientOptions;

    /**
     * e.g. { keepAlive: true }
     * @protected
     */
    protected agentOptions : AgentOptions;

    constructor(options: ProxyClientOptions, agentOptions?: AgentOptions) {
        this.options = options;
        this.agentOptions = agentOptions || {};
    }

    /**
     * Create a http agent for an url.
     *
     * @param input
     */
    async createAgent(input: string) {
        return new Promise((resolve, reject) => {
            const headers : Record<string, any> = { };

            if (
                this.options.user &&
                this.options.password
            ) {
                headers['Proxy-Authorization'] = `Basic ${Buffer.from(`${this.options.user}:${this.options.password}`).toString('base64')}`;
            }

            const urlParsed = new URL(input);
            const request = http.request({
                host: this.options.host,
                port: this.options.port,
                method: 'CONNECT',
                path: `${urlParsed.hostname}:443`,
                headers,
            });

            request.on('connect', (res, socket) => {
                if (
                    res.statusCode >= 200 &&
                    res.statusCode < 300
                ) {
                    resolve(new https.Agent({ socket, ...this.agentOptions }));
                } else {
                    reject(new Error('Could not connect to proxy!'));
                }
            });

            request.on('error', (err) => {
                reject(err);
            });

            request.on('timeout', (err) => {
                reject(err);
            });

            request.end();
        });
    }
}
