/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SMTPConfig, SMTPConfigInput } from './type';

export function buildSMTPConfig(input: SMTPConfigInput) : SMTPConfig {
    return {
        ...input,
        ssl: input.ssl ?? false,
        starttls: input.starttls ?? false,

        fromDisplayName: input.fromDisplayName || input.from,
    };
}
