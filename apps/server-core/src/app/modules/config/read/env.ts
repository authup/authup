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
import type { BetterSqlite3DataSourceOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3DataSourceOptions.js';
import type { MysqlDataSourceOptions } from 'typeorm/driver/mysql/MysqlDataSourceOptions.js';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';

import { ConfigEnvironmentVariableName } from '../constants.ts';
import type { ConfigInput } from '../types.ts';

const BOOLEAN_TRUE_VALUES = new Set(['true', 't', '1', 'yes', 'y', 'on']);
const BOOLEAN_FALSE_VALUES = new Set(['false', 'f', '0', 'no', 'n', 'off']);

/**
 * Boolean env reader that FAILS LOUD on a set-but-unrecognized value instead
 * of silently falling back to the default (envix's `readBool` swallows e.g.
 * `MFA_REQUIRED=yes`). Reserved for security-relevant toggles where a silent
 * default is a weakened posture. Returns `undefined` when the var is unset.
 */
function readBoolStrict(name: ConfigEnvironmentVariableName) : boolean | undefined {
    const raw = read(name);
    if (typeof raw !== 'string' || raw.trim().length === 0) {
        return undefined;
    }

    const normalized = raw.trim().toLowerCase();
    if (BOOLEAN_TRUE_VALUES.has(normalized)) {
        return true;
    }
    if (BOOLEAN_FALSE_VALUES.has(normalized)) {
        return false;
    }

    throw new Error(`The environment variable ${name} must be a boolean value (received "${raw}").`);
}

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
        options.db = readDataSourceOptionsFromEnv() as MysqlDataSourceOptions |
        PostgresDataSourceOptions |
        BetterSqlite3DataSourceOptions;
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

    // -------------------------------------------------------------

    const host = read(ConfigEnvironmentVariableName.HOST);
    if (host) {
        options.host = host;
    }

    const port = readInt(ConfigEnvironmentVariableName.PORT);
    if (typeof port !== 'undefined') {
        options.port = port;
    }

    const publicURL = read(ConfigEnvironmentVariableName.PUBLIC_URL);
    if (publicURL) {
        options.publicUrl = publicURL;
    }

    const mtlsPublicURL = read(ConfigEnvironmentVariableName.MTLS_PUBLIC_URL);
    if (mtlsPublicURL) {
        options.mtlsPublicUrl = mtlsPublicURL;
    }

    const certificateSource = read(ConfigEnvironmentVariableName.CERTIFICATE_SOURCE);
    if (certificateSource) {
        options.certificateSource = certificateSource as ConfigInput['certificateSource'];
    }

    // canonicalized again in normalizeConfig for every config surface; the
    // env read keeps the raw string, the shared canonicalizer decides.
    const trustProxy = read(ConfigEnvironmentVariableName.TRUST_PROXY);
    if (typeof trustProxy === 'string' && trustProxy.trim().length > 0) {
        options.trustProxy = trustProxy;
    }

    const trustedOrigins = readArray(ConfigEnvironmentVariableName.TRUSTED_ORIGINS);
    if (trustedOrigins && trustedOrigins.length > 0) {
        options.trustedOrigins = trustedOrigins;
    }

    const tokenAccessMaxAge = readInt(ConfigEnvironmentVariableName.TOKEN_ACCESS_MAX_AGE);
    if (typeof tokenAccessMaxAge !== 'undefined') {
        options.tokenAccessMaxAge = tokenAccessMaxAge;
    }

    const tokenRefreshMaxAge = readInt(ConfigEnvironmentVariableName.TOKEN_REFRESH_MAX_AGE);
    if (typeof tokenRefreshMaxAge !== 'undefined') {
        options.tokenRefreshMaxAge = tokenRefreshMaxAge;
    }

    const tokenRefreshGracePeriod = readInt(ConfigEnvironmentVariableName.TOKEN_REFRESH_GRACE_PERIOD);
    if (typeof tokenRefreshGracePeriod !== 'undefined') {
        options.tokenRefreshGracePeriod = tokenRefreshGracePeriod;
    }

    const promptLoginMaxAge = readInt(ConfigEnvironmentVariableName.PROMPT_LOGIN_MAX_AGE);
    if (typeof promptLoginMaxAge !== 'undefined') {
        options.promptLoginMaxAge = promptLoginMaxAge;
    }

    const endSessionHintGracePeriod = readInt(ConfigEnvironmentVariableName.END_SESSION_HINT_GRACE_PERIOD);
    if (typeof endSessionHintGracePeriod !== 'undefined') {
        options.endSessionHintGracePeriod = endSessionHintGracePeriod;
    }

    const registrationEnabled = readBool(ConfigEnvironmentVariableName.REGISTRATION_ENABLED);
    if (typeof registrationEnabled !== 'undefined') {
        options.registrationEnabled = registrationEnabled;
    }

    const emailVerificationEnabled = readBool(ConfigEnvironmentVariableName.EMAIL_VERIFICATION_ENABLED);
    if (typeof emailVerificationEnabled !== 'undefined') {
        options.emailVerificationEnabled = emailVerificationEnabled;
    }

    const passwordRecoveryEnabled = readBool(ConfigEnvironmentVariableName.PASSWORD_RECOVERY_ENABLED);
    if (typeof passwordRecoveryEnabled !== 'undefined') {
        options.passwordRecoveryEnabled = passwordRecoveryEnabled;
    }

    const passwordMinLength = readInt(ConfigEnvironmentVariableName.PASSWORD_MIN_LENGTH);
    if (typeof passwordMinLength !== 'undefined') {
        options.passwordMinLength = passwordMinLength;
    }

    const accountConsoleEnabled = readBool(ConfigEnvironmentVariableName.ACCOUNT_CONSOLE_ENABLED);
    if (typeof accountConsoleEnabled !== 'undefined') {
        options.accountConsoleEnabled = accountConsoleEnabled;
    }

    // ---------------------------------------------------------------

    const eventLogEnabled = readBoolStrict(ConfigEnvironmentVariableName.EVENT_LOG_ENABLED);
    if (typeof eventLogEnabled !== 'undefined') {
        options.eventLogEnabled = eventLogEnabled;
    }

    const eventLogRetentionDays = readInt(ConfigEnvironmentVariableName.EVENT_LOG_RETENTION_DAYS);
    if (typeof eventLogRetentionDays !== 'undefined') {
        options.eventLogRetentionDays = eventLogRetentionDays;
    }

    const eventLogEntityEnabled = readBoolStrict(ConfigEnvironmentVariableName.EVENT_LOG_ENTITY_ENABLED);
    if (typeof eventLogEntityEnabled !== 'undefined') {
        options.eventLogEntityEnabled = eventLogEntityEnabled;
    }

    const eventLogEntityRetentionDays = readInt(ConfigEnvironmentVariableName.EVENT_LOG_ENTITY_RETENTION_DAYS);
    if (typeof eventLogEntityRetentionDays !== 'undefined') {
        options.eventLogEntityRetentionDays = eventLogEntityRetentionDays;
    }

    const loginAttemptThrottleEnabled = readBoolStrict(ConfigEnvironmentVariableName.LOGIN_ATTEMPT_THROTTLE_ENABLED);
    if (typeof loginAttemptThrottleEnabled !== 'undefined') {
        options.loginAttemptThrottleEnabled = loginAttemptThrottleEnabled;
    }

    const loginAttemptThreshold = readInt(ConfigEnvironmentVariableName.LOGIN_ATTEMPT_THRESHOLD);
    if (typeof loginAttemptThreshold !== 'undefined') {
        options.loginAttemptThreshold = loginAttemptThreshold;
    }

    const loginAttemptWindow = readInt(ConfigEnvironmentVariableName.LOGIN_ATTEMPT_WINDOW);
    if (typeof loginAttemptWindow !== 'undefined') {
        options.loginAttemptWindow = loginAttemptWindow;
    }

    // ---------------------------------------------------------------

    const mfaEnabled = readBoolStrict(ConfigEnvironmentVariableName.MFA_ENABLED);
    if (typeof mfaEnabled !== 'undefined') {
        options.mfaEnabled = mfaEnabled;
    }

    const mfaRequired = readBoolStrict(ConfigEnvironmentVariableName.MFA_REQUIRED);
    if (typeof mfaRequired !== 'undefined') {
        options.mfaRequired = mfaRequired;
    }

    const mfaFreshnessMaxAge = readInt(ConfigEnvironmentVariableName.MFA_FRESHNESS_MAX_AGE);
    if (typeof mfaFreshnessMaxAge !== 'undefined') {
        options.mfaFreshnessMaxAge = mfaFreshnessMaxAge;
    }

    const mfaTicketMaxAge = readInt(ConfigEnvironmentVariableName.MFA_TICKET_MAX_AGE);
    if (typeof mfaTicketMaxAge !== 'undefined') {
        options.mfaTicketMaxAge = mfaTicketMaxAge;
    }

    const secretsEncryptionKey = read(ConfigEnvironmentVariableName.SECRETS_ENCRYPTION_KEY);
    if (secretsEncryptionKey) {
        options.secretsEncryptionKey = secretsEncryptionKey;
    }

    // ---------------------------------------------------------------

    const clientBasicAuth = readBool(ConfigEnvironmentVariableName.CLIENT_AUTH_BASIC);
    if (typeof clientBasicAuth !== 'undefined') {
        options.clientAuthBasic = clientBasicAuth;
    }

    const clientSystemEnabled = readBool(ConfigEnvironmentVariableName.CLIENT_SYSTEM_ENABLED);
    if (typeof clientSystemEnabled !== 'undefined') {
        options.clientSystemEnabled = clientSystemEnabled;
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

    const permissions = readArray(ConfigEnvironmentVariableName.PERMISSIONS);
    if (permissions && permissions.length > 0) {
        options.permissions = permissions;
    }

    const permissionsDefaultPolicyAssignment = readBool(ConfigEnvironmentVariableName.PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT);
    if (typeof permissionsDefaultPolicyAssignment !== 'undefined') {
        options.permissionsDefaultPolicyAssignment = permissionsDefaultPolicyAssignment;
    }

    return options;
}
