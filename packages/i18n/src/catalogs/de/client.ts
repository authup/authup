/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationClientKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationClientGerman : NamespaceTranslations<`${TranslatorTranslationClientKey}`> = {
    [TranslatorTranslationClientKey.NAME_HINT]: 'Etwas, das Benutzer erkennen und dem sie vertrauen',
    [TranslatorTranslationClientKey.DESCRIPTION_HINT]: 'Wird allen Benutzern dieser Anwendung angezeigt',
    [TranslatorTranslationClientKey.REDIRECT_URI_HINT]: 'URI-Muster, zu dem ein Browser nach einem erfolgreichen Login weiterleiten kann',
    [TranslatorTranslationClientKey.IS_CONFIDENTIAL]: 'Ist vertraulich?',
    [TranslatorTranslationClientKey.IS_ACTIVE]: 'Ist aktiv?',
    [TranslatorTranslationClientKey.HASH_SECRET]: 'Geheimnis hashen?',

    [TranslatorTranslationClientKey.LOGIN_FAILED]: 'Der Anmeldevorgang ist fehlgeschlagen',
    [TranslatorTranslationClientKey.SCOPE_GRANT_INTRO]: 'Dies erlaubt der Anwendung {{client}},',
    [TranslatorTranslationClientKey.ONCE_AUTHORIZED_REDIRECT]: 'Nach der Autorisierung werden Sie weitergeleitet zu:',
    [TranslatorTranslationClientKey.GOVERNED_BY]: 'Diese Anwendung unterliegt den Datenschutz- und Nutzungsbedingungen der Anwendung {{client}}.',
    [TranslatorTranslationClientKey.ACTIVE_SINCE]: 'Aktiv seit',
    [TranslatorTranslationClientKey.VIEW_POLICY_DETAILS]: 'Richtliniendetails anzeigen',
};
