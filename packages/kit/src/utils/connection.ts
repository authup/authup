/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ConnectionString = {
    type: 'user' | 'robot' | 'client',
    url: string,
    name: string,
    password: string
};

const regex = /(?:(user|robot|client):\/\/)(?:(\w+)(?::(\w+))@)(.*)$/;

export function isConnectionString(input: string) : boolean {
    return regex.test(input);
}

export function parseConnectionString(
    input: string,
) : ConnectionString | undefined {
    const match = input.match(regex);

    if (!match) {
        return undefined;
    }

    return {
        type: match[1] as 'user' | 'robot' | 'client',
        url: match[4],
        name: match[2],
        password: match[3],
    };
}
