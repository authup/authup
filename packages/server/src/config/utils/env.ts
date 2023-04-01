/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    hasProcessEnv,
    readBoolFromProcessEnv,
    readBoolOrStringFromProcessEnv,
    readFromProcessEnv,
    readIntFromProcessEnv,
} from '@authup/server-common';
import { hasEnvDataSourceOptions, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import { EnvironmentVariableName } from '../constants';
import type { OptionsInput } from '../type';
import { isDatabaseConnectionConfigurationSupported, isDatabaseTypeSupported } from './database';

export function readConfigFromEnv() : Partial<OptionsInput> {
    const options : OptionsInput = {};

    if (hasProcessEnv(EnvironmentVariableName.NODE_ENV)) {
        options.env = readFromProcessEnv(EnvironmentVariableName.NODE_ENV);
    }

    if (hasProcessEnv(EnvironmentVariableName.WRITABLE_DIRECTORY_PATH)) {
        options.writableDirectoryPath = readFromProcessEnv(EnvironmentVariableName.WRITABLE_DIRECTORY_PATH);
    }

    // -------------------------------------------------------------

    if (hasEnvDataSourceOptions()) {
        const databaseOptions = readDataSourceOptionsFromEnv();
        if (
            databaseOptions &&
            isDatabaseConnectionConfigurationSupported(databaseOptions)
        ) {
            options.database = databaseOptions;
        }
    }

    if (hasProcessEnv(EnvironmentVariableName.REDIS)) {
        options.redis = readBoolOrStringFromProcessEnv(EnvironmentVariableName.REDIS);
    }

    if (hasProcessEnv(EnvironmentVariableName.SMTP)) {
        options.smtp = readBoolOrStringFromProcessEnv(EnvironmentVariableName.SMTP);
    }

    if (hasProcessEnv(EnvironmentVariableName.VAULT)) {
        options.vault = readBoolOrStringFromProcessEnv(EnvironmentVariableName.VAULT);
    }

    // -------------------------------------------------------------

    if (hasProcessEnv(EnvironmentVariableName.HOST)) {
        options.host = readFromProcessEnv(EnvironmentVariableName.HOST);
    }

    if (hasProcessEnv(EnvironmentVariableName.PORT)) {
        options.port = readIntFromProcessEnv(EnvironmentVariableName.PORT);
    }

    if (hasProcessEnv(EnvironmentVariableName.PUBLIC_URL)) {
        options.publicUrl = readFromProcessEnv(EnvironmentVariableName.PUBLIC_URL);
    }

    if (hasProcessEnv(EnvironmentVariableName.AUTHORIZE_REDIRECT_URL)) {
        options.authorizeRedirectUrl = readFromProcessEnv(EnvironmentVariableName.AUTHORIZE_REDIRECT_URL);
    }

    if (hasProcessEnv(EnvironmentVariableName.ACCESS_TOKEN_MAX_AGE)) {
        options.tokenMaxAgeAccessToken = readIntFromProcessEnv(EnvironmentVariableName.ACCESS_TOKEN_MAX_AGE);
    }

    if (hasProcessEnv(EnvironmentVariableName.REFRESH_TOKEN_MAX_AGE)) {
        options.tokenMaxAgeRefreshToken = readIntFromProcessEnv(EnvironmentVariableName.REFRESH_TOKEN_MAX_AGE);
    }

    if (hasProcessEnv(EnvironmentVariableName.REGISTRATION)) {
        options.registration = readBoolFromProcessEnv(EnvironmentVariableName.REGISTRATION);
    }

    if (hasProcessEnv(EnvironmentVariableName.EMAIL_VERIFICATION)) {
        options.emailVerification = readBoolFromProcessEnv(EnvironmentVariableName.EMAIL_VERIFICATION);
    }

    if (hasProcessEnv(EnvironmentVariableName.FORGOT_PASSWORD)) {
        options.forgotPassword = readBoolFromProcessEnv(EnvironmentVariableName.FORGOT_PASSWORD);
    }

    // ---------------------------------------------------------------

    if (hasProcessEnv(EnvironmentVariableName.ADMIN_USERNAME)) {
        options.adminUsername = readFromProcessEnv(EnvironmentVariableName.ADMIN_USERNAME);
    }

    if (hasProcessEnv(EnvironmentVariableName.ADMIN_PASSWORD)) {
        options.adminPassword = readFromProcessEnv(EnvironmentVariableName.ADMIN_PASSWORD);
    }

    if (hasProcessEnv(EnvironmentVariableName.ROBOT_ENABLED)) {
        options.robotEnabled = readBoolFromProcessEnv(EnvironmentVariableName.ROBOT_ENABLED);
    }

    if (hasProcessEnv(EnvironmentVariableName.ROBOT_SECRET)) {
        options.robotSecret = readFromProcessEnv(EnvironmentVariableName.ROBOT_SECRET);
    }

    if (hasProcessEnv(EnvironmentVariableName.PERMISSIONS)) {
        options.permissions = readFromProcessEnv(EnvironmentVariableName.PERMISSIONS);
    }

    return options;
}
