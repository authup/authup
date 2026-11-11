/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationEventFrench : NamespaceTranslations<`${EventName}`> = {
    [EventName.LOGIN]: 'Connexion',
    [EventName.LOGIN_FAILED]: 'Échec de connexion',
    [EventName.LOGOUT]: 'Déconnexion',
    [EventName.AUTHORIZE]: 'Application autorisée',
    [EventName.AUTHORIZE_FAILED]: "Échec de l'autorisation",
    [EventName.REFRESH_REPLAY_DETECTED]: "Réutilisation d'un jeton d'actualisation détectée",
    [EventName.TOKEN_EXCHANGED]: 'Jeton échangé',
    [EventName.REGISTER]: 'Inscription',
    [EventName.ACCOUNT_ACTIVATED]: 'Compte activé',
    [EventName.PASSWORD_RESET_REQUESTED]: 'Réinitialisation du mot de passe demandée',
    [EventName.PASSWORD_RESET_COMPLETED]: 'Réinitialisation du mot de passe terminée',
    [EventName.MFA_ENROLLED]: 'Second facteur ajouté',
    [EventName.MFA_REMOVED]: 'Second facteur supprimé',
    [EventName.MFA_VERIFIED]: 'Second facteur vérifié',
    [EventName.MFA_CHALLENGE_FAILED]: 'Échec du second facteur',
    [EventName.IDENTITY_PROVIDER_LINKED]: 'Compte fournisseur associé',
    [EventName.IDENTITY_PROVIDER_UNLINKED]: 'Compte fournisseur dissocié',
    [EventName.BACKCHANNEL_LOGOUT]: 'Déconnexion back-channel',
    [EventName.BACKCHANNEL_LOGOUT_FAILED]: 'Échec de la déconnexion back-channel',
    [EventName.CLIENT_SECRET_ROTATED]: 'Secret client renouvelé',
    [EventName.CREATED]: 'Créé',
    [EventName.UPDATED]: 'Mis à jour',
    [EventName.DELETED]: 'Supprimé',
};
