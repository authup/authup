/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type MailAddress = {
    name: string
    address: string
};

export type MailSendOptions = {
    to?: string | MailAddress,
    from?: string | MailAddress,
    subject?: string,
    text?: string,
    html?: string,
};

export interface IMailClient {
    send(options: MailSendOptions): Promise<void>;
}
