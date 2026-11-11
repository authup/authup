/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationEventGerman : NamespaceTranslations<`${EventName}`> = {
    [EventName.LOGIN]: 'Anmeldung',
    [EventName.LOGIN_FAILED]: 'Fehlgeschlagene Anmeldung',
    [EventName.LOGOUT]: 'Abmeldung',
    [EventName.AUTHORIZE]: 'Anwendung autorisiert',
    [EventName.AUTHORIZE_FAILED]: 'Autorisierung fehlgeschlagen',
    [EventName.REFRESH_REPLAY_DETECTED]: 'Wiederverwendung eines Refresh-Tokens erkannt',
    [EventName.TOKEN_EXCHANGED]: 'Token getauscht',
    [EventName.REGISTER]: 'Registrierung',
    [EventName.ACCOUNT_ACTIVATED]: 'Konto aktiviert',
    [EventName.PASSWORD_RESET_REQUESTED]: 'Passwort-Reset angefordert',
    [EventName.PASSWORD_RESET_COMPLETED]: 'Passwort-Reset abgeschlossen',
    [EventName.MFA_ENROLLED]: 'Zweiter Faktor hinzugefügt',
    [EventName.MFA_REMOVED]: 'Zweiter Faktor entfernt',
    [EventName.MFA_VERIFIED]: 'Zweiter Faktor bestätigt',
    [EventName.MFA_CHALLENGE_FAILED]: 'Zweiter Faktor fehlgeschlagen',
    [EventName.IDENTITY_PROVIDER_LINKED]: 'Anbieterkonto verknüpft',
    [EventName.IDENTITY_PROVIDER_UNLINKED]: 'Anbieterkonto getrennt',
    [EventName.BACKCHANNEL_LOGOUT]: 'Back-Channel-Abmeldung',
    [EventName.BACKCHANNEL_LOGOUT_FAILED]: 'Back-Channel-Abmeldung fehlgeschlagen',
    [EventName.CLIENT_SECRET_ROTATED]: 'Client-Secret rotiert',
    [EventName.CREATED]: 'Erstellt',
    [EventName.UPDATED]: 'Aktualisiert',
    [EventName.DELETED]: 'Gelöscht',
};
