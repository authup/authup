import {buildHTTPQuery} from "../../../../src/http/utils";

describe('src/http/utils/query.ts', () => {
    it('should build empty query string', () => {
          expect(buildHTTPQuery(undefined)).toEqual('');
          expect(buildHTTPQuery('')).toEqual('');
    });
});
