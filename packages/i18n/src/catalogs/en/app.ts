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

    [TranslatorTranslationAppKey.LOGIN_TITLE]: 'Welcome back',
    [TranslatorTranslationAppKey.LOGIN_SUBTITLE]: 'Select a realm to continue',

    [TranslatorTranslationAppKey.URL_GENERATOR]: 'URL Generator',
    [TranslatorTranslationAppKey.URL_GENERATOR_HINT]: 'Generate an authorize url by picking the scopes it needs to function.',
    [TranslatorTranslationAppKey.REDIRECT_URL]: 'Redirect URL',
    [TranslatorTranslationAppKey.GENERATED_URL]: 'Generated URL',

    [TranslatorTranslationAppKey.TOGGLE_NAVIGATION]: 'Toggle navigation',
    [TranslatorTranslationAppKey.SWITCH_TO_LIGHT_MODE]: 'Switch to light mode',
    [TranslatorTranslationAppKey.SWITCH_TO_DARK_MODE]: 'Switch to dark mode',

    [TranslatorTranslationAppKey.SESSION_RENEW]: 'The session will be renewed in',
    [TranslatorTranslationAppKey.MINUTES]: 'minute(s)',
    [TranslatorTranslationAppKey.SECONDS]: 'second(s)',

    [TranslatorTranslationAppKey.ENTITY_CREATED]: '{{entity}} was successfully created.',
    [TranslatorTranslationAppKey.ENTITY_UPDATED]: '{{entity}} was successfully updated.',
    [TranslatorTranslationAppKey.ENTITY_DELETED]: '{{entity}} "{{name}}" was successfully deleted.',
    [TranslatorTranslationAppKey.ACCOUNT_UPDATED]: 'The account was successfully updated.',
};
