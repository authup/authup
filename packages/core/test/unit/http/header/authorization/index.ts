import {
    buildAuthorizationHeaderValue,
    parseAuthorizationHeaderValue
} from "../../../../../src/http/header/authorization";

describe('src/http/header/authorization/authorization-header.ts', () => {
    it('should throw error', () => {
        expect(() => parseAuthorizationHeaderValue("abc")).toThrowError();

        expect(() => parseAuthorizationHeaderValue("Secret start123")).toThrowError();
    });

    it('should parse basic', () => {
        const basicValue = Buffer.from('admin:start123').toString('base64');
        const value = parseAuthorizationHeaderValue(`Basic ${basicValue}`);

        expect(value.type).toEqual('Basic');

        if(value.type === 'Basic') {
            expect(value.username).toEqual('admin');
            expect(value.password).toEqual('start123');
        }
    });

    it('should not parse basic', () => {
        const basicValue = Buffer.from('admin').toString('base64');

        expect(() => parseAuthorizationHeaderValue(`Basic ${basicValue}`)).toThrowError();
    });

    it('should parse bearer', () => {
        const value = parseAuthorizationHeaderValue(`Bearer start123`);

        expect(value.type).toEqual('Bearer');

        if(value.type === 'Bearer') {
            expect(value.token).toEqual('start123');
        }
    });

    it('should parse api header', () => {
        let value = parseAuthorizationHeaderValue(`API-Key start123`);
        expect(value.type).toEqual('API-Key');

        value = parseAuthorizationHeaderValue(`X-API-Key start123`);
        expect(value.type).toEqual('X-API-Key');

        if(value.type === 'API-Key' || value.type === 'X-API-Key') {
            expect(value.key).toEqual('start123');
        }
    });

    it('should build basic header value', () => {
        const headerValue = buildAuthorizationHeaderValue({type: 'Basic', username: 'admin', password: 'start123'});
        expect(headerValue).toEqual('Basic '+Buffer.from('admin:start123').toString('base64'));
    });

    it('should build bearer header value', () => {
        const headerValue = buildAuthorizationHeaderValue({type: 'Bearer', token: 'start123'});
        expect(headerValue).toEqual(`Bearer start123`);
    });

    it('should build api header value', () => {
        let headerValue = buildAuthorizationHeaderValue({type: 'API-Key', key: 'start123'});
        expect(headerValue).toEqual(`API-Key start123`);

        headerValue = buildAuthorizationHeaderValue({type: 'X-API-Key', key: 'start123'});
        expect(headerValue).toEqual(`X-API-Key start123`);
    });
});
