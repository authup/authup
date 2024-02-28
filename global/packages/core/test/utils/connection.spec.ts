/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseConnectionString } from '../../src';

describe('src/utils/connection', () => {
    it('should parse user connection string', () => {
        const parsed = parseConnectionString('user://admin:start123@http://localhost/');
        expect(parsed.type).toEqual('user');
        expect(parsed.name).toEqual('admin');
        expect(parsed.password).toEqual('start123');
        expect(parsed.url).toEqual('http://localhost/');
    });

    it('should parse robot connection string', () => {
        const parsed = parseConnectionString('robot://admin:start123@http://localhost/');
        expect(parsed.type).toEqual('robot');
        expect(parsed.name).toEqual('admin');
        expect(parsed.password).toEqual('start123');
        expect(parsed.url).toEqual('http://localhost/');
    });

    it('should parse client connection string', () => {
        const parsed = parseConnectionString('client://admin:start123@http://localhost/');
        expect(parsed.type).toEqual('client');
        expect(parsed.name).toEqual('admin');
        expect(parsed.password).toEqual('start123');
        expect(parsed.url).toEqual('http://localhost/');
    });

    it('should parse connection string with port', () => {
        const parsed = parseConnectionString('client://admin:start123@http://localhost:3000/');
        expect(parsed.type).toEqual('client');
        expect(parsed.name).toEqual('admin');
        expect(parsed.password).toEqual('start123');
        expect(parsed.url).toEqual('http://localhost:3000/');
    });
});
