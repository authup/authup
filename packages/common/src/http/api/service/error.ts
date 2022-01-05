/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export class APIServiceError extends Error {
    static connectionStringMissing(serviceName?: string) {
        const parts : string[] = ['The'];
        if (typeof serviceName === 'string') {
            parts.push(serviceName);
        }
        parts.push('connection string is not specified.');
        return new this(parts.join(' '));
    }

    static connectionStringInvalid(serviceName?: string) {
        const parts : string[] = ['The'];
        if (typeof serviceName === 'string') {
            parts.push(serviceName);
        }
        parts.push('connection string is not valid.');
        return new this(parts.join(' '));
    }
}
