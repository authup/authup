/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { definePlural } from 'ilingo';
import { TranslatorTranslationEntityKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationEntityGerman : NamespaceTranslations<`${TranslatorTranslationEntityKey}`> = {
    [TranslatorTranslationEntityKey.CLIENT]: definePlural({ one: 'Client', other: 'Clients' }),
    [TranslatorTranslationEntityKey.EVENT]: definePlural({ one: 'Ereignis', other: 'Ereignisse' }),
    [TranslatorTranslationEntityKey.IDENTITY_PROVIDER]: definePlural({ one: 'Identitätsanbieter', other: 'Identitätsanbieter' }),
    [TranslatorTranslationEntityKey.PERMISSION]: definePlural({ one: 'Berechtigung', other: 'Berechtigungen' }),
    [TranslatorTranslationEntityKey.POLICY]: definePlural({ one: 'Richtlinie', other: 'Richtlinien' }),
    [TranslatorTranslationEntityKey.REALM]: definePlural({ one: 'Organisation', other: 'Organisationen' }),
    [TranslatorTranslationEntityKey.ROBOT]: definePlural({ one: 'Roboter', other: 'Roboter' }),
    [TranslatorTranslationEntityKey.ROLE]: definePlural({ one: 'Rolle', other: 'Rollen' }),
    [TranslatorTranslationEntityKey.SCOPE]: definePlural({ one: 'Bereich', other: 'Bereiche' }),
    [TranslatorTranslationEntityKey.SESSION]: definePlural({ one: 'Sitzung', other: 'Sitzungen' }),
    [TranslatorTranslationEntityKey.USER]: definePlural({ one: 'Benutzer', other: 'Benutzer' }),
};
