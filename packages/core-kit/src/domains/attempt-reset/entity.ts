/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface AttemptReset {
    id: string,

    ip_address: string,

    user_agent: string,

    email: string,

    token: string | null,

    created_at: Date | string,

    updated_at: Date | string,
}
