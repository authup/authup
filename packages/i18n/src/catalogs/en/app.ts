/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationAppKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationAppEnglish : NamespaceTranslations<`${TranslatorTranslationAppKey}`> = {
    [TranslatorTranslationAppKey.HOME]: 'Home',
    [TranslatorTranslationAppKey.RESOURCES]: 'Resources',
    [TranslatorTranslationAppKey.GENERAL]: 'General',
    [TranslatorTranslationAppKey.OTHER]: 'Other',
    [TranslatorTranslationAppKey.SETTINGS]: 'Settings',
    [TranslatorTranslationAppKey.LOGOUT]: 'Logout',
    [TranslatorTranslationAppKey.ACCOUNT]: 'Account',
    [TranslatorTranslationAppKey.MANAGE_ACCOUNT]: 'Manage account',
    [TranslatorTranslationAppKey.SECURITY]: 'Security',

    [TranslatorTranslationAppKey.MANAGEMENT]: 'Management',
    [TranslatorTranslationAppKey.DETAILS]: 'Details',

    [TranslatorTranslationAppKey.REALM_DESCRIPTION]: 'Isolated tenants, each with its own users, clients and keys.',
    [TranslatorTranslationAppKey.CLIENT_DESCRIPTION]: 'Applications that authenticate against Authup.',
    [TranslatorTranslationAppKey.SCOPE_DESCRIPTION]: 'Scopes a client may request when asking for access.',
    [TranslatorTranslationAppKey.IDENTITY_PROVIDER_DESCRIPTION]: 'External providers users can sign in with.',
    [TranslatorTranslationAppKey.KEY_DESCRIPTION]: 'Signing and encryption keys, one store per realm.',
    [TranslatorTranslationAppKey.TRUST_ANCHOR_DESCRIPTION]: 'Trusted CA certificates for client certificate authentication.',
    [TranslatorTranslationAppKey.USER_DESCRIPTION]: 'Accounts that sign in to applications.',
    [TranslatorTranslationAppKey.ROLE_DESCRIPTION]: 'Named bundles of permissions, assigned to users and clients.',
    [TranslatorTranslationAppKey.PERMISSION_DESCRIPTION]: 'Individual capabilities an identity can be granted.',
    [TranslatorTranslationAppKey.POLICY_DESCRIPTION]: 'Rules that decide when a permission applies.',
    [TranslatorTranslationAppKey.EVENT_DESCRIPTION]: 'Append-only audit trail of security relevant activity.',
    [TranslatorTranslationAppKey.SESSION_DESCRIPTION]: 'Active sign-ins, with the devices and tokens behind them.',
    [TranslatorTranslationAppKey.PATH_DESCRIPTION]: 'Folders that organize users and clients inside a realm.',
    [TranslatorTranslationAppKey.DASHBOARD]: 'Dashboard',
    [TranslatorTranslationAppKey.DASHBOARD_DESCRIPTION]: 'Sign-ins, authorizations and events in this realm at a glance.',
    [TranslatorTranslationAppKey.DASHBOARD_WINDOW]: 'Window',
    [TranslatorTranslationAppKey.DASHBOARD_WINDOW_24H]: 'Last 24 hours',
    [TranslatorTranslationAppKey.DASHBOARD_WINDOW_7D]: 'Last 7 days',
    [TranslatorTranslationAppKey.DASHBOARD_WINDOW_30D]: 'Last 30 days',
    [TranslatorTranslationAppKey.DASHBOARD_WINDOW_90D]: 'Last 90 days',
    [TranslatorTranslationAppKey.DASHBOARD_LOGINS]: 'Logins',
    [TranslatorTranslationAppKey.DASHBOARD_LOGINS_FAILED]: 'Failed logins',
    [TranslatorTranslationAppKey.DASHBOARD_AUTHORIZATIONS]: 'Authorizations',
    [TranslatorTranslationAppKey.DASHBOARD_EVENTS]: 'Events',
    [TranslatorTranslationAppKey.DASHBOARD_LOGIN_VOLUME]: 'Logins over time',
    [TranslatorTranslationAppKey.DASHBOARD_EVENTS_BY_TYPE]: 'Events by type',
    [TranslatorTranslationAppKey.DASHBOARD_EVENTS_LINK]: 'View all events',
    [TranslatorTranslationAppKey.DASHBOARD_EMPTY]: 'No events in this window.',
    [TranslatorTranslationAppKey.DASHBOARD_EVENT_LOG_DISABLED]: 'The event log is disabled, so nothing is recorded and there is nothing to show here. Enable it with EVENT_LOG_ENABLED.',
    [TranslatorTranslationAppKey.DASHBOARD_IDENTITIES]: 'Identities',
    [TranslatorTranslationAppKey.DASHBOARD_CONFIGURATION]: 'Configuration',
    [TranslatorTranslationAppKey.SESSIONS_ACTIVE]: 'Active sessions',
    [TranslatorTranslationAppKey.STATS_NEW]: '+{{count}} new',
    [TranslatorTranslationAppKey.STATS_NEW_IN_DAYS]: '+{{count}} in {{days}} days',
    [TranslatorTranslationAppKey.STATS_NEW_IN_HOURS]: '+{{count}} in {{hours}} hours',
    [TranslatorTranslationAppKey.STATS_STRIP_SUMMARY]: 'Daily activity over the last {{days}} days: {{count}} new, {{total}} in total.',
    [TranslatorTranslationAppKey.SET_MANAGEMENT_REALM]: 'Set as management realm',
    [TranslatorTranslationAppKey.API_DOCS]: 'API Docs',
    [TranslatorTranslationAppKey.MADE_WITH]: 'Made with',

    [TranslatorTranslationAppKey.LOGIN_TITLE]: 'Sign in',
    [TranslatorTranslationAppKey.LOGIN_SUBTITLE]: 'Select a realm to continue',

    [TranslatorTranslationAppKey.URL_GENERATOR]: 'URL Generator',
    [TranslatorTranslationAppKey.URL_GENERATOR_HINT]: 'Generate an authorize url by picking the scopes it needs to function.',
    [TranslatorTranslationAppKey.REDIRECT_URL]: 'Redirect URL',
    [TranslatorTranslationAppKey.GENERATED_URL]: 'Generated URL',
    [TranslatorTranslationAppKey.ISSUER]: 'Issuer',
    [TranslatorTranslationAppKey.OPENID_CONFIGURATION_URL]: 'OpenID configuration URL',
    [TranslatorTranslationAppKey.JWKS_URL]: 'JWKS URL',

    [TranslatorTranslationAppKey.TOGGLE_NAVIGATION]: 'Toggle navigation',

    [TranslatorTranslationAppKey.SESSION_RENEW]: 'The session will be renewed in {countdown}.',
    [TranslatorTranslationAppKey.MINUTES]: 'minute(s)',
    [TranslatorTranslationAppKey.SECONDS]: 'second(s)',

    [TranslatorTranslationAppKey.ENTITY_CREATED]: '{{entity}} was successfully created.',
    [TranslatorTranslationAppKey.ENTITY_UPDATED]: '{{entity}} was successfully updated.',
    [TranslatorTranslationAppKey.ENTITY_DELETED]: '{{entity}} "{{name}}" was successfully deleted.',
    [TranslatorTranslationAppKey.ACCOUNT_UPDATED]: 'The account was successfully updated.',

    [TranslatorTranslationAppKey.DELETE_CONFIRM_TITLE]: 'Delete {{entity}}?',
    [TranslatorTranslationAppKey.DELETE_CONFIRM_DESCRIPTION]: 'This action cannot be undone.',

    [TranslatorTranslationAppKey.REMOVE_CONFIRM_TITLE]: 'Confirm removal',
    [TranslatorTranslationAppKey.REMOVE_CONFIRM_DESCRIPTION]: 'Are you sure you want to remove this assignment? You can re-assign it at any time.',

    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS]: 'Log out other devices',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_TITLE]: 'Log out other devices?',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_DESCRIPTION]: 'This signs out all your other sessions. Your current session stays active.',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_SUCCESS]: 'Logged out {{amount}} other session(s).',

    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL]: 'Log out everywhere',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_TITLE]: 'Log this user out everywhere?',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_DESCRIPTION]: 'This revokes every session of this user on all devices.',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_SUCCESS]: 'Logged out {{amount}} session(s).',

    [TranslatorTranslationAppKey.SESSION_CURRENT]: 'This device',
    [TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_ACTIVE]: 'Active',
    [TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_CONSUMED]: 'Consumed',
    [TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_REVOKED]: 'Revoked',
    [TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_EXPIRED]: 'Expired',

    [TranslatorTranslationAppKey.AUTHENTICATOR]: 'Authenticators',
    [TranslatorTranslationAppKey.MFA_SECURITY_TITLE]: 'Two-factor authentication',
    [TranslatorTranslationAppKey.MFA_SECURITY_HINT]: 'Add an extra layer of security with an authenticator app or recovery codes.',

    [TranslatorTranslationAppKey.APPLICATIONS]: 'Applications',
    [TranslatorTranslationAppKey.CONSENT_EMPTY]: 'You have not granted any application access yet.',
    [TranslatorTranslationAppKey.CONSENT_REVOKE]: 'Revoke',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL]: 'Revoke access',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_SUCCESS]: 'Application access was revoked.',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_TITLE]: 'Revoke application access',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_DESCRIPTION]: 'The application will ask for your consent again on the next sign-in.',
    [TranslatorTranslationAppKey.CONSENT_SCOPES]: 'Granted permissions',

    [TranslatorTranslationAppKey.CONNECTED_ACCOUNTS]: 'Connected accounts',
    [TranslatorTranslationAppKey.CONNECTED_ACCOUNTS_NONE]: 'No identity providers are configured.',
    [TranslatorTranslationAppKey.IDENTITY_PROVIDER_CONNECT]: 'Connect',
    [TranslatorTranslationAppKey.IDENTITY_PROVIDER_CONNECTED_AS]: 'Connected as {{name}}',
    [TranslatorTranslationAppKey.IDENTITY_PROVIDER_DISCONNECT]: 'Disconnect',
    [TranslatorTranslationAppKey.IDENTITY_PROVIDER_DISCONNECT_CONFIRM_TITLE]: 'Disconnect account?',
    [TranslatorTranslationAppKey.IDENTITY_PROVIDER_DISCONNECT_CONFIRM_DESCRIPTION]: 'Signing in through this provider will stop working for this account.',
    [TranslatorTranslationAppKey.IDENTITY_PROVIDER_LINK_SUCCESS]: 'The account was connected.',
    [TranslatorTranslationAppKey.IDENTITY_PROVIDER_LINK_FAILED]: 'The account could not be connected.',
    [TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_TITLE]: 'Crypto-shred encryption key?',
    [TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_DESCRIPTION]: 'This key is still referenced by {{count}} encrypted secret(s). Deleting it makes them permanently unrecoverable.',

    [TranslatorTranslationAppKey.PATH_HINT]: 'Purely organizational. A path affects no permission, role or login.',
    [TranslatorTranslationAppKey.PATH_SCOPE]: 'Path',
    [TranslatorTranslationAppKey.PATH_SCOPE_ALL]: 'All paths',
    [TranslatorTranslationAppKey.PATH_SCOPE_TRUNCATED]: 'This folder holds too many subfolders to scope the list, so every row is shown.',
    [TranslatorTranslationAppKey.PATH_SCOPE_INCOMPLETE]: 'This realm holds too many folders to show them all, so the tree stops short.',
    [TranslatorTranslationAppKey.PATH_DELETE_CONFIRM_DESCRIPTION]: 'This deletes {{paths}} subfolders and unfiles {{users}} users and {{clients}} clients. No user and no client is deleted. This action cannot be undone.',
    [TranslatorTranslationAppKey.PATH_DELETE_CONFIRM_UNKNOWN]: 'The subfolders below this folder are deleted and every user and client filed under them is unfiled. The counts could not be read. This action cannot be undone.',

    [TranslatorTranslationAppKey.BACK_TO_APP]: 'Back to {{host}}',
};
