import {AuthorizationHeaderError} from "../../../../src";

describe('src/http/error/authorization-header.ts', () => {
    it('should throw error', () => {
        const simpleError = new AuthorizationHeaderError('');
        expect(() => {throw simpleError}).toThrowError();
        expect(simpleError.code).toEqual('invalid_header');
    });

    it('should throw another error code', () => {
        const simpleError = new AuthorizationHeaderError('', 'invalid_value');
        expect(simpleError.code).toEqual('invalid_value');
    });
});
