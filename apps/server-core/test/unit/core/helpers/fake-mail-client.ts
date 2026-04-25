/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IMailClient, MailSendOptions } from '../../../../src/core/mail/types.ts';

export class FakeMailClient implements IMailClient {
    public sent: MailSendOptions[] = [];

    private queuedErrors: Error[] = [];

    async send(options: MailSendOptions): Promise<void> {
        const error = this.queuedErrors.shift();
        if (error) {
            throw error;
        }
        this.sent.push(options);
    }

    failNext(error: Error = new Error('mail send failure')) {
        this.queuedErrors.push(error);
    }

    clear() {
        this.sent = [];
        this.queuedErrors = [];
    }
}
