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
    [TranslatorTranslationAppKey.SECURITY]: 'Security',

    [TranslatorTranslationAppKey.MANAGEMENT]: 'Management',
    [TranslatorTranslationAppKey.DETAILS]: 'Details',
    [TranslatorTranslationAppKey.SET_MANAGEMENT_REALM]: 'Set as management realm',
    [TranslatorTranslationAppKey.API_DOCS]: 'API Docs',
    [TranslatorTranslationAppKey.MADE_WITH]: 'Made with',

    [TranslatorTranslationAppKey.LOGIN_TITLE]: 'Sign in',
    [TranslatorTranslationAppKey.LOGIN_SUBTITLE]: 'Select a realm to continue',

    [TranslatorTranslationAppKey.URL_GENERATOR]: 'URL Generator',
    [TranslatorTranslationAppKey.URL_GENERATOR_HINT]: 'Generate an authorize url by picking the scopes it needs to function.',
    [TranslatorTranslationAppKey.REDIRECT_URL]: 'Redirect URL',
    [TranslatorTranslationAppKey.GENERATED_URL]: 'Generated URL',

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

    [TranslatorTranslationAppKey.AUTHENTICATOR]: 'Authenticators',
    [TranslatorTranslationAppKey.MFA_SECURITY_TITLE]: 'Two-factor authentication',
    [TranslatorTranslationAppKey.MFA_SECURITY_HINT]: 'Add an extra layer of security with an authenticator app or recovery codes.',

    [TranslatorTranslationAppKey.APPLICATIONS]: 'Applications',
    [TranslatorTranslationAppKey.CONSENT_EMPTY]: 'You have not granted any application access yet.',
    [TranslatorTranslationAppKey.CONSENT_REVOKE]: 'Revoke',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL]: 'Revoke access',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_TITLE]: 'Revoke application access',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_DESCRIPTION]: 'The application will ask for your consent again on the next sign-in.',
    [TranslatorTranslationAppKey.CONSENT_SCOPES]: 'Granted permissions',
    [TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_TITLE]: 'Crypto-shred encryption key?',
    [TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_DESCRIPTION]: 'This key is still referenced by {{count}} encrypted secret(s). Deleting it makes them permanently unrecoverable.',
};
