/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

// A rapiq decode failure is client input, not a server fault: the wire
// query is request-controlled, so a ParseError must surface as 400
// (sanitizeError maps rapiq ParseError/CodecError → BAD_REQUEST). The
// expression dialect throws on disallowed keys by design, and since
// rapiq 2.0.0-beta.20 a pagination key carrying a prototype segment
// throws instead of being silently ignored.
describe('src/http/controllers/entities (query decode errors)', () => {
    const suite = createTestApplication();

    const basic = `Basic ${Buffer.from('admin:start123').toString('base64')}`;

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should answer 400 for a disallowed key in the expression dialect', async () => {
        const response = await httpRequest(suite, 'GET', "/roles?lnln&filter=eq(secret,'x')", { headers: { Authorization: basic } });

        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.BAD_REQUEST);
    });

    it('should answer 400 for a pagination key with a prototype segment', async () => {
        const response = await httpRequest(suite, 'GET', '/roles?page[prototype][limit]=10', { headers: { Authorization: basic } });

        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.BAD_REQUEST);
    });

    it('should keep serving a well-formed query', async () => {
        const response = await httpRequest(suite, 'GET', '/roles?page[limit]=10&sort=-createdAt', { headers: { Authorization: basic } });

        expect(response.status).toEqual(200);
    });
});
