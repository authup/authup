/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { SMTPMailClientAdapter } from '../../../../../src/app/modules/mail/adapter/smtp/smtp.ts';

const { createTransport } = vi.hoisted(() => ({ createTransport: vi.fn((_options: Record<string, any>) => ({})) }));

vi.mock('nodemailer', () => ({ createTransport }));

describe('app/modules/mail/smtp', () => {
    beforeEach(() => {
        createTransport.mockClear();
    });

    it('should verify the server certificate for an object configuration', () => {
        expect(new SMTPMailClientAdapter({
            host: 'smtp.example.com', 
            port: 465, 
            ssl: true, 
        })).toBeDefined();

        expect(createTransport).toHaveBeenCalledTimes(1);
        expect(createTransport.mock.calls[0][0]).toMatchObject({ tls: { rejectUnauthorized: true } });
    });

    it('should verify the server certificate for smtp: true', () => {
        expect(new SMTPMailClientAdapter(true)).toBeDefined();

        expect(createTransport.mock.calls[0][0]).toMatchObject({ tls: { rejectUnauthorized: true } });
    });

    it('should skip verification only when explicitly configured', () => {
        expect(new SMTPMailClientAdapter({ host: 'smtp.example.com', rejectUnauthorized: false })).toBeDefined();

        expect(createTransport.mock.calls[0][0]).toMatchObject({ tls: { rejectUnauthorized: false } });
    });
});
