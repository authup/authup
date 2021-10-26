/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    stringifyAuthorizationHeader,
    parseAuthorizationHeader
} from "../../../../../src";

describe('src/http/header/authorization/authorization-header.ts', () => {
    it('should throw error', () => {
        expect(() => parseAuthorizationHeader("abc")).toThrowError();

        expect(() => parseAuthorizationHeader("Secret start123")).toThrowError();
    });

    it('should parse basic', () => {
        const basicValue = Buffer.from('admin:start123').toString('base64');
        const value = parseAuthorizationHeader(`Basic ${basicValue}`);

        expect(value.type).toEqual('Basic');

        if(value.type === 'Basic') {
            expect(value.username).toEqual('admin');
            expect(value.password).toEqual('start123');
        }
    });

    it('should not parse basic', () => {
        const basicValue = Buffer.from('admin').toString('base64');

        expect(() => parseAuthorizationHeader(`Basic ${basicValue}`)).toThrowError();
    });

    it('should parse bearer', () => {
        const value = parseAuthorizationHeader(`Bearer start123`);

        expect(value.type).toEqual('Bearer');

        if(value.type === 'Bearer') {
            expect(value.token).toEqual('start123');
        }
    });

    it('should parse api header', () => {
        let value = parseAuthorizationHeader(`API-Key start123`);
        expect(value.type).toEqual('API-Key');

        value = parseAuthorizationHeader(`X-API-Key start123`);
        expect(value.type).toEqual('X-API-Key');

        if(value.type === 'API-Key' || value.type === 'X-API-Key') {
            expect(value.key).toEqual('start123');
        }
    });

    it('should build basic header value', () => {
        const headerValue = stringifyAuthorizationHeader({type: 'Basic', username: 'admin', password: 'start123'});
        expect(headerValue).toEqual('Basic '+Buffer.from('admin:start123').toString('base64'));
    });

    it('should build bearer header value', () => {
        const headerValue = stringifyAuthorizationHeader({type: 'Bearer', token: 'start123'});
        expect(headerValue).toEqual(`Bearer start123`);
    });

    it('should build api header value', () => {
        let headerValue = stringifyAuthorizationHeader({type: 'API-Key', key: 'start123'});
        expect(headerValue).toEqual(`API-Key start123`);

        headerValue = stringifyAuthorizationHeader({type: 'X-API-Key', key: 'start123'});
        expect(headerValue).toEqual(`X-API-Key start123`);
    });
});
