/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CoreOptions } from '../type';
import {
    hasEnv, requireBoolOrStringFromEnv, requireBooleanFromEnv, requireFromEnv, requireIntegerFromEnv,
} from '../../../utils';

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

    if (hasEnv('REDIS')) {
        options.redis = requireBoolOrStringFromEnv('REDIS');
    }

    if (hasEnv('SMTP')) {
        options.smtp = requireBoolOrStringFromEnv('SMTP');
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
