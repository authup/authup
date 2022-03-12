/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildHTTPQuery } from '../../../../src';

describe('src/http/utils/query.ts', () => {
    it('should build empty query string', () => {
        expect(buildHTTPQuery(undefined)).toEqual('');
        expect(buildHTTPQuery('')).toEqual('');
        expect(buildHTTPQuery({})).toEqual('');
    });

    it('should build with simple object', () => {
        const query = buildHTTPQuery({
            id: 1,
            name: 'admin',
        }, false);
        expect(query).toEqual('id=1&name=admin');
    });

    it('should build with simple object', () => {
        const query = buildHTTPQuery({
            id: 1,
            name: 'admin',
        });
        expect(query).toEqual('?id=1&name=admin');
    });

    it('should build with simple object with array value', () => {
        const query = buildHTTPQuery({
            ids: [1, 2, 3],
        });

        expect(query).toEqual('?ids=1%2C2%2C3');
    });

    it('should build with simple object with object value', () => {
        let query = buildHTTPQuery({
            filter: {
                id: 1,
            },
        });

        expect(query).toEqual('?filter%5Bid%5D=1');

        query = buildHTTPQuery({
            filter: {
                id: [1, 2, 3],
            },
        });

        expect(query).toEqual('?filter%5Bid%5D=1%2C2%2C3');
    });
});
