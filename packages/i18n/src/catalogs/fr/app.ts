/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationAppKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationAppFrench : NamespaceTranslations<`${TranslatorTranslationAppKey}`> = {
    [TranslatorTranslationAppKey.HOME]: 'Accueil',
    [TranslatorTranslationAppKey.RESOURCES]: 'Ressources',
    [TranslatorTranslationAppKey.GENERAL]: 'Général',
    [TranslatorTranslationAppKey.OTHER]: 'Autre',
    [TranslatorTranslationAppKey.SETTINGS]: 'Paramètres',
    [TranslatorTranslationAppKey.LOGOUT]: 'Déconnexion',
    [TranslatorTranslationAppKey.ACCOUNT]: 'Compte',
    [TranslatorTranslationAppKey.MANAGE_ACCOUNT]: 'Gérer le compte',
    [TranslatorTranslationAppKey.SECURITY]: 'Sécurité',

    [TranslatorTranslationAppKey.MANAGEMENT]: 'Gestion',
    [TranslatorTranslationAppKey.DETAILS]: 'Détails',
    [TranslatorTranslationAppKey.SET_MANAGEMENT_REALM]: 'Définir comme realm de gestion',
    [TranslatorTranslationAppKey.API_DOCS]: 'Documentation API',
    [TranslatorTranslationAppKey.MADE_WITH]: 'Fait avec',

    [TranslatorTranslationAppKey.LOGIN_TITLE]: 'Connexion',
    [TranslatorTranslationAppKey.LOGIN_SUBTITLE]: 'Sélectionnez un realm pour continuer',

    [TranslatorTranslationAppKey.URL_GENERATOR]: 'Générateur d\'URL',
    [TranslatorTranslationAppKey.URL_GENERATOR_HINT]: 'Générez une URL d\'autorisation en choisissant les portées dont elle a besoin pour fonctionner.',
    [TranslatorTranslationAppKey.REDIRECT_URL]: 'URL de redirection',
    [TranslatorTranslationAppKey.GENERATED_URL]: 'URL générée',

    [TranslatorTranslationAppKey.TOGGLE_NAVIGATION]: 'Basculer la navigation',

    [TranslatorTranslationAppKey.SESSION_RENEW]: 'La session sera renouvelée dans {countdown}.',
    [TranslatorTranslationAppKey.MINUTES]: 'minute(s)',
    [TranslatorTranslationAppKey.SECONDS]: 'seconde(s)',

    [TranslatorTranslationAppKey.ENTITY_CREATED]: '{{entity}} a été créé avec succès.',
    [TranslatorTranslationAppKey.ENTITY_UPDATED]: '{{entity}} a été mis à jour avec succès.',
    [TranslatorTranslationAppKey.ENTITY_DELETED]: '{{entity}} « {{name}} » a été supprimé avec succès.',
    [TranslatorTranslationAppKey.ACCOUNT_UPDATED]: 'Le compte a été mis à jour avec succès.',

    [TranslatorTranslationAppKey.DELETE_CONFIRM_TITLE]: 'Supprimer {{entity}} ?',
    [TranslatorTranslationAppKey.DELETE_CONFIRM_DESCRIPTION]: 'Cette action est irréversible.',

    [TranslatorTranslationAppKey.REMOVE_CONFIRM_TITLE]: 'Confirmer le retrait',
    [TranslatorTranslationAppKey.REMOVE_CONFIRM_DESCRIPTION]: 'Voulez-vous vraiment retirer cette attribution ? Vous pourrez la réattribuer à tout moment.',

    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS]: 'Déconnecter les autres appareils',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_TITLE]: 'Déconnecter les autres appareils ?',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_DESCRIPTION]: 'Cela déconnecte toutes vos autres sessions. Votre session actuelle reste active.',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_SUCCESS]: '{{amount}} autre(s) session(s) déconnectée(s).',

    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL]: 'Déconnecter partout',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_TITLE]: 'Déconnecter cet utilisateur partout ?',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_DESCRIPTION]: 'Cela révoque toutes les sessions de cet utilisateur sur tous les appareils.',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_SUCCESS]: '{{amount}} session(s) déconnectée(s).',

    [TranslatorTranslationAppKey.SESSION_CURRENT]: 'Cet appareil',

    [TranslatorTranslationAppKey.AUTHENTICATOR]: 'Authentificateurs',
    [TranslatorTranslationAppKey.MFA_SECURITY_TITLE]: 'Authentification à deux facteurs',
    [TranslatorTranslationAppKey.MFA_SECURITY_HINT]: 'Ajoutez une couche de sécurité avec une application d\'authentification ou des codes de récupération.',

    [TranslatorTranslationAppKey.APPLICATIONS]: 'Applications',
    [TranslatorTranslationAppKey.CONSENT_EMPTY]: 'Vous n\'avez encore accordé l\'accès à aucune application.',
    [TranslatorTranslationAppKey.CONSENT_REVOKE]: 'Révoquer',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL]: 'Révoquer l\'accès',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_TITLE]: 'Révoquer l\'accès de l\'application',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_DESCRIPTION]: 'L\'application demandera à nouveau votre consentement lors de la prochaine connexion.',
    [TranslatorTranslationAppKey.CONSENT_SCOPES]: 'Permissions accordées',
    [TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_TITLE]: 'Détruire la clé de chiffrement ?',
    [TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_DESCRIPTION]: 'Cette clé est encore référencée par {{count}} secret(s) chiffré(s). Sa suppression les rendra définitivement irrécupérables.',
};
