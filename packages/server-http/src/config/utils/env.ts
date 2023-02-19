/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    hasProcessEnv,
    readBoolFromProcessEnv,
    readFromProcessEnv,
    readIntFromProcessEnv,
} from '@authup/server-common';
import type { OptionsInput } from '../type';

export function readOptionsFromEnv() : OptionsInput {
    const options : OptionsInput = {};

    if (hasProcessEnv('NODE_ENV')) {
        options.env = readFromProcessEnv('NODE_ENV');
    }

    if (hasProcessEnv('WRITABLE_DIRECTORY_PATH')) {
        options.writableDirectoryPath = readFromProcessEnv('WRITABLE_DIRECTORY_PATH');
    }

    if (hasProcessEnv('HOST')) {
        options.host = readFromProcessEnv('HOST');
    }

    if (hasProcessEnv('PORT')) {
        options.port = readIntFromProcessEnv('PORT');
    }

    if (hasProcessEnv('PUBLIC_URL')) {
        options.publicUrl = readFromProcessEnv('PUBLIC_URL');
    }

    if (hasProcessEnv('AUTHORIZE_REDIRECT_URL')) {
        options.authorizeRedirectUrl = readFromProcessEnv('AUTHORIZE_REDIRECT_URL');
    }

    if (hasProcessEnv('ACCESS_TOKEN_MAX_AGE')) {
        options.tokenMaxAgeRefreshToken = readIntFromProcessEnv('ACCESS_TOKEN_MAX_AGE');
    }

    if (hasProcessEnv('REFRESH_TOKEN_MAX_AGE')) {
        options.tokenMaxAgeAccessToken = readIntFromProcessEnv('REFRESH_TOKEN_MAX_AGE');
    }

    if (hasProcessEnv('REGISTRATION')) {
        options.registration = readBoolFromProcessEnv('REGISTRATION');
    }

    if (hasProcessEnv('EMAIL_VERIFICATION')) {
        options.emailVerification = readBoolFromProcessEnv('EMAIL_VERIFICATION');
    }

    if (hasProcessEnv('FORGOT_PASSWORD')) {
        options.forgotPassword = readBoolFromProcessEnv('FORGOT_PASSWORD');
    }

    return options;
}
