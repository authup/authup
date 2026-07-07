/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationErrorFrench : NamespaceTranslations<`${ErrorCode}`> = {
    [ErrorCode.BAD_REQUEST]: 'La requête n\'a pas pu être traitée.',
    [ErrorCode.INTERNAL_ERROR]: 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.',

    [ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED]: 'Le type d\'en-tête d\'autorisation n\'est pas pris en charge.',
    [ErrorCode.HTTP_BEARER_TOKEN_MALFORMED]: 'Le jeton bearer est mal formé.',

    [ErrorCode.IDENTITY_UNAUTHORIZED]: 'Vous n\'êtes pas authentifié.',

    [ErrorCode.ENTITY_CREDENTIALS_INVALID]: 'Les identifiants fournis sont invalides.',
    [ErrorCode.ENTITY_INACTIVE]: 'L\'entité est inactive.',
    [ErrorCode.ENTITY_NOT_FOUND]: 'L\'entité demandée est introuvable.',
    [ErrorCode.ENTITY_CONFLICT]: 'Une entité avec ces détails existe déjà.',
    [ErrorCode.ENTITY_RELATION_INVALID]: 'Une relation référencée est invalide.',

    [ErrorCode.REGISTRATION_DISABLED]: 'L\'inscription est actuellement désactivée.',
    [ErrorCode.PASSWORD_RECOVERY_DISABLED]: 'La récupération de mot de passe est actuellement désactivée.',
    [ErrorCode.EMAIL_VERIFICATION_REQUIRED]: 'Votre adresse e-mail doit d\'abord être vérifiée.',
    [ErrorCode.RESET_TOKEN_EXPIRED]: 'Le jeton de réinitialisation a expiré. Veuillez en demander un nouveau.',

    [ErrorCode.STORAGE_INSUFFICIENT]: 'L\'espace de stockage disponible est insuffisant pour effectuer cette action.',

    [ErrorCode.JWK_INVALID]: 'La clé web JSON est invalide.',
    [ErrorCode.JWK_NOT_FOUND]: 'La clé web JSON est introuvable.',

    [ErrorCode.JWT_INVALID]: 'Le jeton est invalide.',
    [ErrorCode.JWT_INACTIVE]: 'Le jeton n\'est pas encore actif.',
    [ErrorCode.JWT_EXPIRED]: 'Le jeton a expiré. Veuillez vous reconnecter.',

    [ErrorCode.OAUTH_REDIRECT_URI_MISMATCH]: 'L\'URI de redirection ne correspond pas.',
    [ErrorCode.OAUTH_CLIENT_INVALID]: 'Le client est invalide.',
    [ErrorCode.OAUTH_GRANT_INVALID]: 'L\'autorisation d\'accès est invalide.',
    [ErrorCode.OAUTH_GRANT_TYPE_UNSUPPORTED]: 'Le type d\'autorisation n\'est pas pris en charge.',
    [ErrorCode.OAUTH_REQUEST_INVALID]: 'La requête est invalide.',
    [ErrorCode.OAUTH_LOGIN_REQUIRED]: 'Vous devez vous connecter pour continuer.',
    [ErrorCode.OAUTH_RESPONSE_TYPE_UNSUPPORTED]: 'Le type de réponse n\'est pas pris en charge.',
    [ErrorCode.OAUTH_SCOPE_INVALID]: 'La portée demandée est invalide.',
    [ErrorCode.OAUTH_SCOPE_INSUFFICIENT]: 'La portée accordée est insuffisante pour cette action.',

    [ErrorCode.PERMISSION_NOT_FOUND]: 'La permission est introuvable.',
    [ErrorCode.PERMISSION_DENIED]: 'Vous n\'avez pas la permission d\'effectuer cette action.',
    [ErrorCode.PERMISSION_EVALUATION_FAILED]: 'La permission n\'a pas pu être évaluée.',

    [ErrorCode.POLICY_EVALUATOR_NOT_FOUND]: 'Aucun évaluateur n\'a été trouvé pour cette politique.',
    [ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE]: 'Cette politique n\'a pas pu être traitée.',
    [ErrorCode.POLICY_EVALUATOR_CONTEXT_INVALID]: 'Le contexte d\'évaluation de la politique est invalide.',
};
