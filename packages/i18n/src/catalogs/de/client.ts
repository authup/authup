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
};
