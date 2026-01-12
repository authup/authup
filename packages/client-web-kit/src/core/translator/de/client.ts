/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';
import { TranslatorTranslationClientKey } from '../constants';

export const TranslatorTranslationClientGerman : LinesRecord = {
    [TranslatorTranslationClientKey.NAME_HINT]: 'Etwas, das Benutzer erkennen und vertrauen werden',
    [TranslatorTranslationClientKey.DESCRIPTION_HINT]: 'Dies wird allen Benutzern dieser Anwendung angezeigt',
    [TranslatorTranslationClientKey.REDIRECT_URI_HINT]: 'URI-Muster, zu dem ein Browser nach einem erfolgreichen Login weiterleiten kann',
    [TranslatorTranslationClientKey.IS_CONFIDENTIAL]: 'Ist vertraulich?',
    [TranslatorTranslationClientKey.IS_ACTIVE]: 'Ist aktiv?',
    [TranslatorTranslationClientKey.HASH_SECRET]: 'Geheimnis hashen?',
};
