/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SMTPOptions, SMTPOptionsInput } from './type';
import { Config } from '../type';
import { removePrefixFromConfigKey } from '../utils';

export function buildSMTPOptions(input: SMTPOptionsInput) : SMTPOptions {
    return {
        ...input,
        ssl: input.ssl ?? false,
        starttls: input.starttls ?? false,

        fromDisplayName: input.fromDisplayName || input.from,
    };
}

export function hasConfigSMTPOptions(config: Config) : boolean {
    return !!config.smtpHost && !!config.smtpFrom;
}

export function buildSMTPOptionsFromConfig(config: Config) : SMTPOptions {
    const data : Partial<SMTPOptionsInput> = {};

    const keys = Object.keys(config);
    for (let i = 0; i < keys.length; i++) {
        if (keys[i].startsWith('smtp')) {
            const targetKey = removePrefixFromConfigKey(keys[i], 'smtp');
            data[targetKey] = config[keys[i]];
        }
    }

    return buildSMTPOptions(data as SMTPOptionsInput);
}
