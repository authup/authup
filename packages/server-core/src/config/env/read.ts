/*
 * Copyright (c) 2022-2024.
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
import { EnvironmentVariableName } from './constants';
import type { ConfigInput } from '../types';
import { isDatabaseConnectionConfigurationSupported } from '../utils';

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

    const cookieDomain = read(EnvironmentVariableName.COOKIE_DOMAIN);
    if (cookieDomain) {
        options.cookieDomain = cookieDomain;
    }

    const authorizeRedirectURL = read(EnvironmentVariableName.AUTHORIZE_REDIRECT_URL);
    if (authorizeRedirectURL) {
        options.authorizeRedirectUrl = authorizeRedirectURL;
    }

    const tokenAccessMaxAge = readInt(EnvironmentVariableName.TOKEN_ACCESS_MAX_AGE);
    if (typeof tokenAccessMaxAge !== 'undefined') {
        options.tokenAccessMaxAge = tokenAccessMaxAge;
    }

    const tokenRefreshMaxAge = readInt(EnvironmentVariableName.TOKEN_REFRESH_MAX_AGE);
    if (typeof tokenRefreshMaxAge !== 'undefined') {
        options.tokenRefreshMaxAge = tokenRefreshMaxAge;
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

    const clientBasicAuth = readBool(EnvironmentVariableName.CLIENT_AUTH_BASIC);
    if (typeof clientBasicAuth !== 'undefined') {
        options.clientAuthBasic = clientBasicAuth;
    }

    // ---------------------------------------------------------------

    const userBasicAuth = readBool(EnvironmentVariableName.USER_AUTH_BASIC);
    if (typeof userBasicAuth !== 'undefined') {
        options.userAuthBasic = userBasicAuth;
    }

    const userAdminEnabled = readBool(EnvironmentVariableName.USER_ADMIN_ENABLED);
    if (typeof userAdminEnabled !== 'undefined') {
        options.userAdminEnabled = userAdminEnabled;
    }

    const userAdminName = read(EnvironmentVariableName.USER_ADMIN_NAME);
    if (userAdminName) {
        options.userAdminName = userAdminName;
    }

    const userAdminPassword = read(EnvironmentVariableName.USER_ADMIN_PASSWORD);
    if (userAdminPassword) {
        options.userAdminPassword = userAdminPassword;
    }

    const userAdminPasswordReset = readBool(EnvironmentVariableName.USER_ADMIN_PASSWORD_RESET);
    if (typeof userAdminPasswordReset !== 'undefined') {
        options.userAdminPasswordReset = userAdminPasswordReset;
    }

    // ---------------------------------------------------------------

    const robotBasicAuth = readBool(EnvironmentVariableName.ROBOT_AUTH_BASIC);
    if (typeof robotBasicAuth !== 'undefined') {
        options.robotAuthBasic = robotBasicAuth;
    }

    const robotAdminName = read(EnvironmentVariableName.ROBOT_ADMIN_NAME);
    if (robotAdminName) {
        options.robotAdminName = robotAdminName;
    }

    const robotAdminEnabled = readBool(EnvironmentVariableName.ROBOT_ADMIN_ENABLED);
    if (typeof robotAdminEnabled !== 'undefined') {
        options.robotAdminEnabled = robotAdminEnabled;
    }

    const robotAdminSecret = read(EnvironmentVariableName.ROBOT_ADMIN_SECRET);
    if (robotAdminSecret) {
        options.robotAdminSecret = robotAdminSecret;
    }

    const robotAdminSecretReset = readBool(EnvironmentVariableName.ROBOT_ADMIN_SECRET_RESET);
    if (typeof robotAdminSecretReset !== 'undefined') {
        options.robotAdminSecretReset = robotAdminSecretReset;
    }

    // ---------------------------------------------------------------

    const permissions = readArray(EnvironmentVariableName.PERMISSIONS);
    if (permissions && permissions.length > 0) {
        options.permissions = permissions;
    }

    return options;
}
