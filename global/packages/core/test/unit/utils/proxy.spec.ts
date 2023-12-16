/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseProxyConnectionString } from '../../../src';

describe('src/utils/proxy', () => {
    it('should parse', () => {
        const output = parseProxyConnectionString(
            'http://127.0.0.1:80',
        );

        expect(output).toBeDefined();
        expect(output.protocol).toEqual('http');
        expect(output.host).toEqual('127.0.0.1');
        expect(output.port).toEqual(80);
        expect(output.auth.username).toBeUndefined();
        expect(output.auth.password).toBeUndefined();
    });

    it('should parse with user + password', () => {
        const output = parseProxyConnectionString(
            'http://user:password@127.0.0.1:443',
        );

        expect(output).toBeDefined();
        expect(output.protocol).toEqual('http');
        expect(output.host).toEqual('127.0.0.1');
        expect(output.port).toEqual(443);
        expect(output.auth.username).toEqual('user');
        expect(output.auth.password).toEqual('password');
    });

    it('should not parse with invalid protocol', () => {
        const output = parseProxyConnectionString(
            'ftp://127.0.0.1:443',
        );

        expect(output).toBeUndefined();
    });
});
