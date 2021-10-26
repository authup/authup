/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {AuthorizationHeaderValue} from "./type";
import {AuthorizationHeaderError} from "../../error";

export * from './type';

export function parseAuthorizationHeaderValue(value: string) : AuthorizationHeaderValue {
    const parts : string[] = value.split(" ");

    if(parts.length < 2) {
        throw AuthorizationHeaderError.parseType();
    }

    const type : string = parts[0].toLowerCase();
    const id : string = parts[1];

    switch (type) {
        case "basic":
            const base64Decoded = Buffer.from(id, 'base64').toString('utf-8');
            const base64Parts = base64Decoded.split(":");

            if(base64Parts.length !== 2) {
                throw AuthorizationHeaderError.parse();
            }

            return {
                type: "Basic",
                username: base64Parts[0],
                password: base64Parts[1]
            }
        case "bearer":
            return {
                type: "Bearer",
                token: id
            }
        case "api-key":
        case "x-api-key":
            return {
                type: type === 'api-key' ? 'API-Key' : 'X-API-Key',
                key: id
            }
        default:
            throw AuthorizationHeaderError.parseType();
    }
}

export function buildAuthorizationHeaderValue(options: AuthorizationHeaderValue) : string {
    switch (options.type) {
        case "Basic":
            const basicStr : string = Buffer
                .from(options.username+':'+options.password)
                .toString("base64");

            return `Basic ${basicStr}`;
        case "Bearer":
            return `Bearer ${options.token}`;
        case "X-API-Key":
        case "API-Key":
            return `${options.type} ${options.key}`;
    }
}
