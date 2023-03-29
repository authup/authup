/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ProxyConnectionConfig = {
    protocol: 'http' | 'https',
    host: string,
    port: number,
    auth: {
        username: string,
        password: string,
    }
};

export function parseProxyConnectionString(
    input: string,
) : ProxyConnectionConfig | undefined {
    const match = input
        .match(/(?:(https|http):\/\/)(?:(\w+)(?::(\w+))?@)?(?:([^:]+))(?::(\d{1,5}))?$/);

    if (!match) {
        return undefined;
    }

    return {
        protocol: match[1] as 'http' | 'https',
        host: match[4],
        port: parseInt(match[5], 10),
        auth: {
            username: match[2],
            password: match[3],
        },
    };
}
