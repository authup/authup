/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationActionKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationActionGerman : NamespaceTranslations<`${TranslatorTranslationActionKey}`> = {
    [TranslatorTranslationActionKey.ADD]: 'Hinzufügen',
    [TranslatorTranslationActionKey.CREATE]: 'Erstellen',
    [TranslatorTranslationActionKey.DELETE]: 'Löschen',
    [TranslatorTranslationActionKey.GENERATE]: 'Generieren',
    [TranslatorTranslationActionKey.UPDATE]: 'Aktualisieren',
    [TranslatorTranslationActionKey.AUTHORIZE]: 'Autorisieren',
    [TranslatorTranslationActionKey.ABORT]: 'Abbrechen',
    [TranslatorTranslationActionKey.LOGIN]: 'Anmelden',

    [TranslatorTranslationActionKey.REGISTER]: 'Registrieren',
    [TranslatorTranslationActionKey.ACTIVATE]: 'Aktivieren',
    [TranslatorTranslationActionKey.RESET]: 'Zurücksetzen',
    [TranslatorTranslationActionKey.SEND]: 'Senden',
    [TranslatorTranslationActionKey.BACK]: 'Zurück',
    [TranslatorTranslationActionKey.CLOSE]: 'Schließen',
    [TranslatorTranslationActionKey.LOOKUP]: 'Nachschlagen',
    [TranslatorTranslationActionKey.SHOW]: 'Anzeigen',
    [TranslatorTranslationActionKey.HIDE]: 'Verbergen',
    [TranslatorTranslationActionKey.REMOVE]: 'Entfernen',
    [TranslatorTranslationActionKey.RETRY]: 'Erneut versuchen',
};
