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

    [TranslatorTranslationAppKey.DELETE_CONFIRM_TITLE]: 'Confirm deletion',
    [TranslatorTranslationAppKey.DELETE_CONFIRM_DESCRIPTION]: 'Are you sure you want to delete this {{entity}}? This action cannot be undone.',

    [TranslatorTranslationAppKey.REMOVE_CONFIRM_TITLE]: 'Confirm removal',
    [TranslatorTranslationAppKey.REMOVE_CONFIRM_DESCRIPTION]: 'Are you sure you want to remove this assignment? You can re-assign it at any time.',
};
