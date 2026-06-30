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
    [TranslatorTranslationClientKey.SCOPE_GRANT_INTRO]: 'Dies erlaubt der Anwendung {client},',
    [TranslatorTranslationClientKey.ONCE_AUTHORIZED_REDIRECT]: 'Nach der Autorisierung werden Sie weitergeleitet zu {target}.',
    [TranslatorTranslationClientKey.GOVERNED_BY]: 'Diese Anwendung unterliegt der {privacyPolicy} und den {termsOfService} der Anwendung {{client}}.',
    [TranslatorTranslationClientKey.ACTIVE_SINCE]: 'Aktiv seit',
    [TranslatorTranslationClientKey.VIEW_POLICY_DETAILS]: 'Richtliniendetails anzeigen',

    [TranslatorTranslationClientKey.CREATE_ACCOUNT]: 'Konto erstellen',
    [TranslatorTranslationClientKey.FORGOT_PASSWORD]: 'Passwort vergessen?',
    [TranslatorTranslationClientKey.RESET_PASSWORD]: 'Passwort zurücksetzen',
    [TranslatorTranslationClientKey.ACTIVATE_ACCOUNT]: 'Konto aktivieren',
    [TranslatorTranslationClientKey.BACK_TO_LOGIN]: 'Zurück zur Anmeldung',
    [TranslatorTranslationClientKey.EMAIL_OR_NAME]: 'E-Mail oder Name',
    [TranslatorTranslationClientKey.CHECK_EMAIL_ACTIVATE]: 'Prüfe deine E-Mails für den Aktivierungscode.',
    [TranslatorTranslationClientKey.CHECK_EMAIL_RESET]: 'Prüfe deine E-Mails für den Code zum Zurücksetzen.',
    [TranslatorTranslationClientKey.ACCOUNT_ACTIVATED]: 'Das Konto wurde erfolgreich aktiviert.',
    [TranslatorTranslationClientKey.PASSWORD_RESET_DONE]: 'Das Passwort wurde erfolgreich zurückgesetzt.',
    [TranslatorTranslationClientKey.WORKFLOW_DISABLED]: 'Diese Funktion ist nicht aktiviert.',
    [TranslatorTranslationClientKey.PRIVACY_POLICY]: 'Datenschutzerklärung',
    [TranslatorTranslationClientKey.TERMS_OF_SERVICE]: 'Nutzungsbedingungen',

    [TranslatorTranslationClientKey.POLICY_TYPE_COMPOSITE]: 'Komposit',
    [TranslatorTranslationClientKey.POLICY_TYPE_DATE]: 'Datum',
    [TranslatorTranslationClientKey.POLICY_TYPE_TIME]: 'Uhrzeit',
    [TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTE_NAMES]: 'Attributnamen',
    [TranslatorTranslationClientKey.POLICY_TYPE_ATTRIBUTES]: 'Attribute',
    [TranslatorTranslationClientKey.POLICY_TYPE_REALM_MATCH]: 'Realm-Abgleich',
    [TranslatorTranslationClientKey.POLICY_TYPE_IDENTITY]: 'Identität',
    [TranslatorTranslationClientKey.POLICY_TYPE_PERMISSION_BINDING]: 'Berechtigungsbindung',

    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_UNANIMOUS]: 'Alle Richtlinien müssen positiv ausfallen.',
    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_AFFIRMATIVE]: 'Mindestens eine Richtlinie muss positiv ausfallen.',
    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_CONSENSUS]: 'Es müssen mehr Richtlinien positiv als negativ ausfallen.',
    [TranslatorTranslationClientKey.DECISION_STRATEGY_HINT_DEFAULT]: 'Keine Strategie ausgewählt. Standard ist einstimmig (alle Richtlinien müssen positiv ausfallen).',
    [TranslatorTranslationClientKey.OPTION_NONE_UNANIMOUS]: '-- Keine (Standard: einstimmig) --',

    [TranslatorTranslationClientKey.REALM_MATCH_STRICT_HINT]: 'Nur übereinstimmen, wenn das Attribut exakt dem Namen entspricht?',
    [TranslatorTranslationClientKey.REALM_MATCH_NULL_MATCH_ALL_HINT]: 'Bestimmt, ob Ressourcen mit leerem Realm-ID-/Namens-Wert mit allen Identitäts-Realms übereinstimmen.{br}Wenn aktiviert, kann jeder Identitäts-Realm auf Ressourcen mit leeren Realm-Werten zugreifen.',

    [TranslatorTranslationClientKey.ENABLE_STARTTLS_HINT]: 'StartTLS-Prozess aktivieren?',
    [TranslatorTranslationClientKey.PASSWORD_MUST_MATCH]: 'Muss mit dem Passwort übereinstimmen.',
    [TranslatorTranslationClientKey.LOOKUP_FAILED]: 'Abfrage fehlgeschlagen mit: {{message}}',
    [TranslatorTranslationClientKey.PROTOCOL_NOT_SUPPORTED]: '{{name}} wird noch nicht unterstützt.',

    [TranslatorTranslationClientKey.JUNCTION_POLICY]: 'Verknüpfungsrichtlinie',
    [TranslatorTranslationClientKey.JUNCTION_REALM_SCOPE]: 'Realm-Geltungsbereich',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN]: 'Eigener Realm',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN_HINT]: 'Wirkt nur im eigenen Realm des Inhabers.',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN_OR_NULL]: 'Eigener + global',
    [TranslatorTranslationClientKey.REALM_SCOPE_OWN_OR_NULL_HINT]: 'Eigener Realm sowie globale (realm-lose) Ressourcen.',
    [TranslatorTranslationClientKey.REALM_SCOPE_ANY]: 'Beliebiger Realm',
    [TranslatorTranslationClientKey.REALM_SCOPE_ANY_HINT]: 'Wirkt auf alle Realms, einschließlich global. Reichweite auf Administratorebene.',
    [TranslatorTranslationClientKey.SELECTION_UPDATING]: 'Auswahl wird aktualisiert',
    [TranslatorTranslationClientKey.SELECTION_REMOVE]: 'Aus der Auswahl entfernen',
    [TranslatorTranslationClientKey.SELECTION_ADD]: 'Zur Auswahl hinzufügen',
};
