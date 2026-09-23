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
import { createFakeRole } from '../../../../utils';
import { createTestApplication } from '../../../../app';

/**
 * The API must answer the stored instant whatever the timezone of the Node
 * process (#3641). The columns are zone-less and stamped by the database
 * server in UTC; without an explicit UTC read the postgres and mysql drivers
 * interpret them in the process timezone, and a row created now would come
 * back shifted by the offset. A zone far from UTC makes a shift impossible to
 * miss; sqlite is unaffected and passes either way.
 */
describe('src/http/controllers/entities (timestamp timezone)', () => {
    const previous = process.env.TZ;
    const suite = createTestApplication();

    beforeAll(async () => {
        process.env.TZ = 'Pacific/Kiritimati';
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();

        if (typeof previous === 'undefined') {
            delete process.env.TZ;
        } else {
            process.env.TZ = previous;
        }
    });

    it('should answer the stored instant in UTC', async () => {
        expect(new Date().getTimezoneOffset()).toEqual(-14 * 60);

        const before = Date.now();
        const { data: role } = await suite.client.role.create(createFakeRole());
        const { data: read } = await suite.client.role.getOne(role.id);

        // the database clock and the host clock agree to well under a minute;
        // a timezone shift is fourteen hours
        for (const value of [role.createdAt, read.createdAt, read.updatedAt]) {
            expect(Math.abs(Date.parse(value) - before)).toBeLessThan(60_000);
        }
    });
});
