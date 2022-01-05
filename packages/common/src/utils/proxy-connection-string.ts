/*
 * Copyright (c) 2021.
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

export function parseProxyConnectionString(connectionStr: string) : ProxyConnectionConfig | undefined {
    const match = connectionStr
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

export function detectProxyConnectionConfig() : ProxyConnectionConfig | undefined {
    const envKeys = [
        'https_proxy',
        'HTTPS_PROXY',
        'http_proxy',
        'HTTP_PROXY',
    ];

    let result : string | undefined;

    for (let i = 0; i < envKeys.length; i++) {
        const envKey = envKeys[i];
        const envVal = process.env[envKey];

        if (
            envVal !== undefined &&
            envVal !== null
        ) {
            result = result || envVal;
        }
    }

    if (!result) {
        return undefined;
    }

    return parseProxyConnectionString(result);
}
