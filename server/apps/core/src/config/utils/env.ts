/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    getEnv,
    getEnvBool,
    getEnvBoolOrString,
    getEnvInt,
    hasEnv,
} from '@authup/core';
import { hasEnvDataSourceOptions, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import { EnvironmentVariableName } from '../constants';
import type { ConfigInput } from '../type';
import { isDatabaseConnectionConfigurationSupported } from './database';

export function readConfigFromEnv() : ConfigInput {
    const options : ConfigInput = {};

    if (hasEnv(EnvironmentVariableName.NODE_ENV)) {
        options.env = getEnv(EnvironmentVariableName.NODE_ENV);
    }

    if (hasEnv(EnvironmentVariableName.WRITABLE_DIRECTORY_PATH)) {
        options.writableDirectoryPath = getEnv(EnvironmentVariableName.WRITABLE_DIRECTORY_PATH);
    }

    // -------------------------------------------------------------

    if (hasEnvDataSourceOptions()) {
        const databaseOptions = readDataSourceOptionsFromEnv();
        if (
            databaseOptions &&
            isDatabaseConnectionConfigurationSupported(databaseOptions)
        ) {
            options.db = databaseOptions;
        }
    }

    if (hasEnv(EnvironmentVariableName.REDIS)) {
        options.redis = getEnvBoolOrString(EnvironmentVariableName.REDIS);
    }

    if (hasEnv(EnvironmentVariableName.SMTP)) {
        options.smtp = getEnvBoolOrString(EnvironmentVariableName.SMTP);
    }

    if (hasEnv(EnvironmentVariableName.VAULT)) {
        options.vault = getEnvBoolOrString(EnvironmentVariableName.VAULT);
    }

    // -------------------------------------------------------------

    if (hasEnv(EnvironmentVariableName.HOST)) {
        options.host = getEnv(EnvironmentVariableName.HOST);
    }

    if (hasEnv(EnvironmentVariableName.PORT)) {
        options.port = getEnvInt(EnvironmentVariableName.PORT);
    }

    if (hasEnv(EnvironmentVariableName.PUBLIC_URL)) {
        options.publicUrl = getEnv(EnvironmentVariableName.PUBLIC_URL);
    }

    if (hasEnv(EnvironmentVariableName.AUTHORIZE_REDIRECT_URL)) {
        options.authorizeRedirectUrl = getEnv(EnvironmentVariableName.AUTHORIZE_REDIRECT_URL);
    }

    if (hasEnv(EnvironmentVariableName.ACCESS_TOKEN_MAX_AGE)) {
        options.tokenMaxAgeAccessToken = getEnvInt(EnvironmentVariableName.ACCESS_TOKEN_MAX_AGE);
    }

    if (hasEnv(EnvironmentVariableName.REFRESH_TOKEN_MAX_AGE)) {
        options.tokenMaxAgeRefreshToken = getEnvInt(EnvironmentVariableName.REFRESH_TOKEN_MAX_AGE);
    }

    if (hasEnv(EnvironmentVariableName.REGISTRATION)) {
        options.registration = getEnvBool(EnvironmentVariableName.REGISTRATION);
    }

    if (hasEnv(EnvironmentVariableName.EMAIL_VERIFICATION)) {
        options.emailVerification = getEnvBool(EnvironmentVariableName.EMAIL_VERIFICATION);
    }

    if (hasEnv(EnvironmentVariableName.FORGOT_PASSWORD)) {
        options.forgotPassword = getEnvBool(EnvironmentVariableName.FORGOT_PASSWORD);
    }

    // ---------------------------------------------------------------

    if (hasEnv(EnvironmentVariableName.ADMIN_USERNAME)) {
        options.adminUsername = getEnv(EnvironmentVariableName.ADMIN_USERNAME);
    }

    if (hasEnv(EnvironmentVariableName.ADMIN_PASSWORD)) {
        options.adminPassword = getEnv(EnvironmentVariableName.ADMIN_PASSWORD);
    }

    if (hasEnv(EnvironmentVariableName.ROBOT_ENABLED)) {
        options.robotEnabled = getEnvBool(EnvironmentVariableName.ROBOT_ENABLED);
    }

    if (hasEnv(EnvironmentVariableName.ROBOT_SECRET)) {
        options.robotSecret = getEnv(EnvironmentVariableName.ROBOT_SECRET);
    }

    if (hasEnv(EnvironmentVariableName.PERMISSIONS)) {
        options.permissions = getEnv(EnvironmentVariableName.PERMISSIONS);
    }

    return options;
}
