/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CoreOptions } from '../type';
import {
    hasEnv, requireBooleanFromEnv, requireFromEnv, requireIntegerFromEnv,
} from '../../../utils';

export function extractRedisOptionFromEnv() : string | boolean {
    if (hasEnv('REDIS')) {
        const envValue = requireBooleanFromEnv('REDIS', null);
        if (envValue === null) {
            return requireFromEnv('REDIS');
        }

        return envValue;
    }

    return undefined;
}

export function extractSmtpOptionFromEnv() : string | boolean {
    if (hasEnv('SMTP')) {
        const envValue = requireBooleanFromEnv('SMTP', null);
        if (envValue === null) {
            return requireFromEnv('SMTP');
        }

        return envValue;
    }

    return undefined;
}

export function extractCoreOptionsFromEnv() : Partial<CoreOptions> {
    const options : Partial<CoreOptions> = {};

    if (hasEnv('NODE_ENV')) {
        options.env = requireFromEnv('NODE_ENV');
    }

    if (hasEnv('PORT')) {
        options.port = requireIntegerFromEnv('PORT');
    }

    if (hasEnv('SELF_URL')) {
        options.selfUrl = requireFromEnv('SELF_URL');
    }

    if (hasEnv('WEB_URL')) {
        options.webUrl = requireFromEnv('WEB_URL');
    }

    if (hasEnv('WRITABLE_DIRECTORY_PATH')) {
        options.writableDirectoryPath = requireFromEnv('WRITABLE_DIRECTORY_PATH');
    }

    if (hasEnv('ACCESS_TOKEN_MAX_AGE')) {
        options.tokenMaxAgeRefreshToken = requireIntegerFromEnv('ACCESS_TOKEN_MAX_AGE');
    }

    if (hasEnv('REFRESH_TOKEN_MAX_AGE')) {
        options.tokenMaxAgeAccessToken = requireIntegerFromEnv('REFRESH_TOKEN_MAX_AGE');
    }

    const redis = extractRedisOptionFromEnv();
    if (typeof redis !== 'undefined') {
        options.redis = redis;
    }

    const smtp = extractSmtpOptionFromEnv();
    if (typeof smtp !== 'undefined') {
        options.smtp = smtp;
    }

    // -------------------------------------------------

    if (hasEnv('REGISTRATION')) {
        options.registration = requireBooleanFromEnv('REGISTRATION');
    }

    if (hasEnv('EMAIL_VERIFICATION')) {
        options.emailVerification = requireBooleanFromEnv('EMAIL_VERIFICATION');
    }

    if (hasEnv('FORGOT_PASSWORD')) {
        options.forgotPassword = requireBooleanFromEnv('FORGOT_PASSWORD');
    }

    return options;
}
