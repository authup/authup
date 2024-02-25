/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    oneOf,
    read,
    readArray,
    readBool,
    readInt,
} from 'envix';
import { hasEnvDataSourceOptions, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import { EnvironmentVariableName } from '../constants';
import type { ConfigInput } from '../type';
import { isDatabaseConnectionConfigurationSupported } from './database';

export function readConfigFromEnv() : ConfigInput {
    const options : ConfigInput = {};

    const env = read(EnvironmentVariableName.NODE_ENV);
    if (env) {
        options.env = env;
    }

    const writableDirectoryPath = read(EnvironmentVariableName.WRITABLE_DIRECTORY_PATH);
    if (writableDirectoryPath) {
        options.writableDirectoryPath = writableDirectoryPath;
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

    const redis = oneOf([
        readBool(EnvironmentVariableName.REDIS),
        read(EnvironmentVariableName.REDIS),
    ]);
    if (typeof redis !== 'undefined') {
        options.redis = redis;
    }

    const smtp = oneOf([
        readBool(EnvironmentVariableName.SMTP),
        read(EnvironmentVariableName.SMTP),
    ]);
    if (typeof smtp !== 'undefined') {
        options.smtp = smtp;
    }

    const vault = oneOf([
        readBool(EnvironmentVariableName.VAULT),
        read(EnvironmentVariableName.VAULT),
    ]);
    if (typeof vault !== 'undefined') {
        options.vault = vault;
    }

    // -------------------------------------------------------------

    const host = read(EnvironmentVariableName.HOST);
    if (host) {
        options.host = host;
    }

    const port = readInt(EnvironmentVariableName.PORT);
    if (port) {
        options.port = Number.parseInt(`${port}`, 10);
    }

    const publicURL = read(EnvironmentVariableName.PUBLIC_URL);
    if (publicURL) {
        options.publicUrl = publicURL;
    }

    const authorizeRedirectURL = read(EnvironmentVariableName.AUTHORIZE_REDIRECT_URL);
    if (authorizeRedirectURL) {
        options.authorizeRedirectUrl = authorizeRedirectURL;
    }

    const accessTokenMaxAge = readInt(EnvironmentVariableName.ACCESS_TOKEN_MAX_AGE);
    if (typeof accessTokenMaxAge !== 'undefined') {
        options.tokenMaxAgeAccessToken = accessTokenMaxAge;
    }

    const refreshTokenMaxAge = readInt(EnvironmentVariableName.REFRESH_TOKEN_MAX_AGE);
    if (typeof refreshTokenMaxAge !== 'undefined') {
        options.tokenMaxAgeAccessToken = refreshTokenMaxAge;
    }

    const registration = readBool(EnvironmentVariableName.REGISTRATION);
    if (typeof registration !== 'undefined') {
        options.registration = registration;
    }

    const emailVerification = readBool(EnvironmentVariableName.EMAIL_VERIFICATION);
    if (typeof registration !== 'undefined') {
        options.emailVerification = emailVerification;
    }

    const forgotPassword = readBool(EnvironmentVariableName.FORGOT_PASSWORD);
    if (typeof forgotPassword !== 'undefined') {
        options.forgotPassword = forgotPassword;
    }

    // ---------------------------------------------------------------

    const clientBasicAuth = readBool(EnvironmentVariableName.CLIENT_BASIC_AUTH);
    if (typeof clientBasicAuth !== 'undefined') {
        options.clientBasicAuth = clientBasicAuth;
    }

    const adminUsername = read(EnvironmentVariableName.ADMIN_USERNAME);
    if (adminUsername) {
        options.adminUsername = adminUsername;
    }

    const adminPassword = read(EnvironmentVariableName.ADMIN_PASSWORD);
    if (adminPassword) {
        options.adminPassword = adminPassword;
    }

    const userBasicAuth = readBool(EnvironmentVariableName.USER_BASIC_AUTH);
    if (typeof userBasicAuth !== 'undefined') {
        options.userBasicAuth = userBasicAuth;
    }

    const robotBasicAuth = readBool(EnvironmentVariableName.ROBOT_BASIC_AUTH);
    if (typeof robotBasicAuth !== 'undefined') {
        options.robotBasicAuth = robotBasicAuth;
    }

    const robotEnabled = readBool(EnvironmentVariableName.ROBOT_ENABLED);
    if (typeof robotEnabled !== 'undefined') {
        options.robotEnabled = robotEnabled;
    }

    const robotSecret = read(EnvironmentVariableName.ROBOT_SECRET);
    if (robotSecret) {
        options.robotSecret = robotSecret;
    }

    const permissions = readArray(EnvironmentVariableName.PERMISSIONS);
    if (permissions && permissions.length > 0) {
        options.permissions = permissions;
    }

    return options;
}
