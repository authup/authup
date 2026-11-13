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

const { createTransport, sendMail } = vi.hoisted(() => {
    const sendMail = vi.fn(async (_options: Record<string, any>) => undefined);

    return {
        sendMail,
        createTransport: vi.fn((_options: Record<string, any>) => ({ sendMail })),
    };
});

vi.mock('nodemailer', () => ({ createTransport }));

describe('app/modules/mail/smtp', () => {
    beforeEach(() => {
        createTransport.mockClear();
        sendMail.mockClear();
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

    it('should honour rejectUnauthorized next to a connection string', () => {
        expect(new SMTPMailClientAdapter({ connectionString: 'smtps://relay.example.com', rejectUnauthorized: false })).toBeDefined();

        expect(createTransport.mock.calls[0][0]).toEqual({
            url: 'smtps://relay.example.com',
            tls: { rejectUnauthorized: false },
        });
    });

    it('should bound a send with a deadline of its own', async () => {
        const adapter = new SMTPMailClientAdapter(true);

        await adapter.send({ to: 'peter@example.com', subject: 'foo' });

        expect(sendMail).toHaveBeenCalledTimes(1);
        expect(sendMail.mock.calls[0][0]).toMatchObject({ to: 'peter@example.com', subject: 'foo' });
        expect(sendMail.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
        expect(sendMail.mock.calls[0][0].signal.aborted).toBe(false);
    });

    it('should keep the signal of the caller', async () => {
        const adapter = new SMTPMailClientAdapter(true);
        const controller = new AbortController();

        await adapter.send({ to: 'peter@example.com', signal: controller.signal });

        expect(sendMail.mock.calls[0][0].signal).toBe(controller.signal);
    });
});
