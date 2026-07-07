/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationErrorGerman : NamespaceTranslations<`${ErrorCode}`> = {
    [ErrorCode.BAD_REQUEST]: 'Die Anfrage konnte nicht verarbeitet werden.',
    [ErrorCode.INTERNAL_ERROR]: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',

    [ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED]: 'Der Typ des Autorisierungs-Headers wird nicht unterstützt.',
    [ErrorCode.HTTP_BEARER_TOKEN_MALFORMED]: 'Das Bearer-Token ist fehlerhaft.',

    [ErrorCode.IDENTITY_UNAUTHORIZED]: 'Du bist nicht authentifiziert.',

    [ErrorCode.ENTITY_CREDENTIALS_INVALID]: 'Die angegebenen Anmeldedaten sind ungültig.',
    [ErrorCode.ENTITY_INACTIVE]: 'Der Eintrag ist inaktiv.',
    [ErrorCode.ENTITY_NOT_FOUND]: 'Der angeforderte Eintrag konnte nicht gefunden werden.',
    [ErrorCode.ENTITY_CONFLICT]: 'Ein Eintrag mit diesen Angaben existiert bereits.',
    [ErrorCode.ENTITY_RELATION_INVALID]: 'Eine referenzierte Beziehung ist ungültig.',

    [ErrorCode.REGISTRATION_DISABLED]: 'Die Registrierung ist derzeit deaktiviert.',
    [ErrorCode.PASSWORD_RECOVERY_DISABLED]: 'Die Passwort-Wiederherstellung ist derzeit deaktiviert.',
    [ErrorCode.EMAIL_VERIFICATION_REQUIRED]: 'Deine E-Mail-Adresse muss zuerst bestätigt werden.',
    [ErrorCode.RESET_TOKEN_EXPIRED]: 'Das Reset-Token ist abgelaufen. Bitte fordere ein neues an.',

    [ErrorCode.STORAGE_INSUFFICIENT]: 'Es ist nicht genügend Speicherplatz verfügbar, um diese Aktion auszuführen.',

    [ErrorCode.JWK_INVALID]: 'Der JSON Web Key ist ungültig.',
    [ErrorCode.JWK_NOT_FOUND]: 'Der JSON Web Key konnte nicht gefunden werden.',

    [ErrorCode.JWT_INVALID]: 'Das Token ist ungültig.',
    [ErrorCode.JWT_INACTIVE]: 'Das Token ist noch nicht aktiv.',
    [ErrorCode.JWT_EXPIRED]: 'Das Token ist abgelaufen. Bitte melde dich erneut an.',

    [ErrorCode.OAUTH_REDIRECT_URI_MISMATCH]: 'Die Weiterleitungs-URI stimmt nicht überein.',
    [ErrorCode.OAUTH_CLIENT_INVALID]: 'Der Client ist ungültig.',
    [ErrorCode.OAUTH_GRANT_INVALID]: 'Die Autorisierungsfreigabe ist ungültig.',
    [ErrorCode.OAUTH_GRANT_TYPE_UNSUPPORTED]: 'Der Grant-Typ wird nicht unterstützt.',
    [ErrorCode.OAUTH_REQUEST_INVALID]: 'Die Anfrage ist ungültig.',
    [ErrorCode.OAUTH_LOGIN_REQUIRED]: 'Sie müssen sich anmelden, um fortzufahren.',
    [ErrorCode.OAUTH_INTERACTION_REQUIRED]: 'Eine Interaktion ist erforderlich, um fortzufahren.',
    [ErrorCode.OAUTH_ACCOUNT_SELECTION_REQUIRED]: 'Bitte wählen Sie ein Konto aus, um fortzufahren.',
    [ErrorCode.OAUTH_CONSENT_REQUIRED]: 'Ihre Zustimmung ist erforderlich, um fortzufahren.',
    [ErrorCode.OAUTH_RESPONSE_TYPE_UNSUPPORTED]: 'Der Response-Typ wird nicht unterstützt.',
    [ErrorCode.OAUTH_SCOPE_INVALID]: 'Der angeforderte Bereich ist ungültig.',
    [ErrorCode.OAUTH_SCOPE_INSUFFICIENT]: 'Der gewährte Bereich reicht für diese Aktion nicht aus.',

    [ErrorCode.PERMISSION_NOT_FOUND]: 'Die Berechtigung konnte nicht gefunden werden.',
    [ErrorCode.PERMISSION_DENIED]: 'Du hast keine Berechtigung, diese Aktion auszuführen.',
    [ErrorCode.PERMISSION_EVALUATION_FAILED]: 'Die Berechtigung konnte nicht ausgewertet werden.',

    [ErrorCode.POLICY_EVALUATOR_NOT_FOUND]: 'Für diese Richtlinie wurde kein Evaluator gefunden.',
    [ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE]: 'Diese Richtlinie konnte nicht verarbeitet werden.',
    [ErrorCode.POLICY_EVALUATOR_CONTEXT_INVALID]: 'Der Kontext der Richtlinienauswertung ist ungültig.',
};
