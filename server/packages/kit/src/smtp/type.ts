/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type SmtpConfig = {
    host?: string,

    port?: number,

    user?: string,

    password?: string,

    ssl?: boolean,

    starttls?: boolean,

    from?: string,

    fromDisplayName?: string,

    replyTo?: string,

    replyToDisplayName?: string,

    connectionString?: string
};
