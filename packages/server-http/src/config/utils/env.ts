/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    hasEnv,
    requireBooleanFromEnv,
    requireFromEnv,
    requireIntegerFromEnv,
} from '@authup/server-common';
import { OptionsInput } from '../type';

export function readOptionsFromEnv() : OptionsInput {
    const options : OptionsInput = {};

    if (hasEnv('NODE_ENV')) {
        options.env = requireFromEnv('NODE_ENV');
    }

    if (hasEnv('WRITABLE_DIRECTORY_PATH')) {
        options.writableDirectoryPath = requireFromEnv('WRITABLE_DIRECTORY_PATH');
    }

    if (hasEnv('HOST')) {
        options.host = requireFromEnv('HOST');
    }

    if (hasEnv('PORT')) {
        options.port = requireIntegerFromEnv('PORT');
    }

    if (hasEnv('PUBLIC_URL')) {
        options.publicUrl = requireFromEnv('PUBLIC_URL');
    }

    if (hasEnv('AUTHORIZE_REDIRECT_URL')) {
        options.authorizeRedirectUrl = requireFromEnv('AUTHORIZE_REDIRECT_URL');
    }

    if (hasEnv('ACCESS_TOKEN_MAX_AGE')) {
        options.tokenMaxAgeRefreshToken = requireIntegerFromEnv('ACCESS_TOKEN_MAX_AGE');
    }

    if (hasEnv('REFRESH_TOKEN_MAX_AGE')) {
        options.tokenMaxAgeAccessToken = requireIntegerFromEnv('REFRESH_TOKEN_MAX_AGE');
    }

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
