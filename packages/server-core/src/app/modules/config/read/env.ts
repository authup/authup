/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    oneOf, read, readArray, readBool, readInt,
} from 'envix';
import { hasEnvDataSourceOptions, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions.js';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions.js';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';

import { ConfigEnvironmentVariableName } from '../constants.ts';
import type { ConfigInput } from '../types.ts';

export function readConfigRawFromEnv() : ConfigInput {
    const options : ConfigInput = {};

    const env = read(ConfigEnvironmentVariableName.NODE_ENV);
    if (env) {
        options.env = env;
    }

    const writableDirectoryPath = read(ConfigEnvironmentVariableName.WRITABLE_DIRECTORY_PATH);
    if (writableDirectoryPath) {
        options.writableDirectoryPath = writableDirectoryPath;
    }

    // -------------------------------------------------------------

    if (hasEnvDataSourceOptions()) {
        // todo: type casting should be avoided
        options.db = readDataSourceOptionsFromEnv() as MysqlConnectionOptions |
        PostgresConnectionOptions |
        BetterSqlite3ConnectionOptions;
    }

    const redis = oneOf([
        readBool(ConfigEnvironmentVariableName.REDIS),
        read(ConfigEnvironmentVariableName.REDIS),
    ]);
    if (typeof redis !== 'undefined') {
        options.redis = redis;
    }

    const smtp = oneOf([
        readBool(ConfigEnvironmentVariableName.SMTP),
        read(ConfigEnvironmentVariableName.SMTP),
    ]);
    if (typeof smtp !== 'undefined') {
        options.smtp = smtp;
    }

    const vault = oneOf([
        readBool(ConfigEnvironmentVariableName.VAULT),
        read(ConfigEnvironmentVariableName.VAULT),
    ]);
    if (typeof vault !== 'undefined') {
        options.vault = vault;
    }

    // -------------------------------------------------------------

    const host = read(ConfigEnvironmentVariableName.HOST);
    if (host) {
        options.host = host;
    }

    const port = readInt(ConfigEnvironmentVariableName.PORT);
    if (port) {
        options.port = Number.parseInt(`${port}`, 10);
    }

    const publicURL = read(ConfigEnvironmentVariableName.PUBLIC_URL);
    if (publicURL) {
        options.publicUrl = publicURL;
    }

    const cookieDomain = read(ConfigEnvironmentVariableName.COOKIE_DOMAIN);
    if (cookieDomain) {
        options.cookieDomain = cookieDomain;
    }

    const tokenAccessMaxAge = readInt(ConfigEnvironmentVariableName.TOKEN_ACCESS_MAX_AGE);
    if (typeof tokenAccessMaxAge !== 'undefined') {
        options.tokenAccessMaxAge = tokenAccessMaxAge;
    }

    const tokenRefreshMaxAge = readInt(ConfigEnvironmentVariableName.TOKEN_REFRESH_MAX_AGE);
    if (typeof tokenRefreshMaxAge !== 'undefined') {
        options.tokenRefreshMaxAge = tokenRefreshMaxAge;
    }

    const registration = readBool(ConfigEnvironmentVariableName.REGISTRATION);
    if (typeof registration !== 'undefined') {
        options.registration = registration;
    }

    const emailVerification = readBool(ConfigEnvironmentVariableName.EMAIL_VERIFICATION);
    if (typeof registration !== 'undefined') {
        options.emailVerification = emailVerification;
    }

    const forgotPassword = readBool(ConfigEnvironmentVariableName.FORGOT_PASSWORD);
    if (typeof forgotPassword !== 'undefined') {
        options.forgotPassword = forgotPassword;
    }

    // ---------------------------------------------------------------

    const clientBasicAuth = readBool(ConfigEnvironmentVariableName.CLIENT_AUTH_BASIC);
    if (typeof clientBasicAuth !== 'undefined') {
        options.clientAuthBasic = clientBasicAuth;
    }

    const clientAdminEnabled = readBool(ConfigEnvironmentVariableName.CLIENT_SYSTEM_ENABLED);
    if (typeof clientAdminEnabled !== 'undefined') {
        options.clientSystemEnabled = clientAdminEnabled;
    }

    const clientAdminSecret = read(ConfigEnvironmentVariableName.CLIENT_SYSTEM_SECRET);
    if (clientAdminSecret) {
        options.clientSystemSecret = clientAdminSecret;
    }

    const clientAdminSecretReset = readBool(ConfigEnvironmentVariableName.CLIENT_SYSTEM_SECRET_RESET);
    if (typeof clientAdminSecretReset !== 'undefined') {
        options.clientSystemSecretReset = clientAdminSecretReset;
    }

    // ---------------------------------------------------------------

    const userBasicAuth = readBool(ConfigEnvironmentVariableName.USER_AUTH_BASIC);
    if (typeof userBasicAuth !== 'undefined') {
        options.userAuthBasic = userBasicAuth;
    }

    const userAdminEnabled = readBool(ConfigEnvironmentVariableName.USER_ADMIN_ENABLED);
    if (typeof userAdminEnabled !== 'undefined') {
        options.userAdminEnabled = userAdminEnabled;
    }

    const userAdminPassword = read(ConfigEnvironmentVariableName.USER_ADMIN_PASSWORD);
    if (userAdminPassword) {
        options.userAdminPassword = userAdminPassword;
    }

    const userAdminPasswordReset = readBool(ConfigEnvironmentVariableName.USER_ADMIN_PASSWORD_RESET);
    if (typeof userAdminPasswordReset !== 'undefined') {
        options.userAdminPasswordReset = userAdminPasswordReset;
    }

    // ---------------------------------------------------------------

    const robotBasicAuth = readBool(ConfigEnvironmentVariableName.ROBOT_AUTH_BASIC);
    if (typeof robotBasicAuth !== 'undefined') {
        options.robotAuthBasic = robotBasicAuth;
    }

    const robotAdminEnabled = readBool(ConfigEnvironmentVariableName.ROBOT_ADMIN_ENABLED);
    if (typeof robotAdminEnabled !== 'undefined') {
        options.robotAdminEnabled = robotAdminEnabled;
    }

    const robotAdminSecret = read(ConfigEnvironmentVariableName.ROBOT_ADMIN_SECRET);
    if (robotAdminSecret) {
        options.robotAdminSecret = robotAdminSecret;
    }

    const robotAdminSecretReset = readBool(ConfigEnvironmentVariableName.ROBOT_ADMIN_SECRET_RESET);
    if (typeof robotAdminSecretReset !== 'undefined') {
        options.robotAdminSecretReset = robotAdminSecretReset;
    }

    // ---------------------------------------------------------------

    const permissions = readArray(ConfigEnvironmentVariableName.PERMISSIONS);
    if (permissions && permissions.length > 0) {
        options.permissions = permissions;
    }

    return options;
}
