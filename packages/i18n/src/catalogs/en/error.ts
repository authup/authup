/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationErrorEnglish : NamespaceTranslations<`${ErrorCode}`> = {
    [ErrorCode.BAD_REQUEST]: 'The request could not be processed.',
    [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again later.',

    [ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED]: 'The authorization header type is not supported.',
    [ErrorCode.HTTP_BEARER_TOKEN_MALFORMED]: 'The bearer token is malformed.',

    [ErrorCode.IDENTITY_UNAUTHORIZED]: 'You are not authenticated.',

    [ErrorCode.ENTITY_CREDENTIALS_INVALID]: 'The provided credentials are invalid.',
    [ErrorCode.ENTITY_INACTIVE]: 'The entity is inactive.',
    [ErrorCode.ENTITY_NOT_FOUND]: 'The requested entity could not be found.',
    [ErrorCode.ENTITY_CONFLICT]: 'An entity with these details already exists.',
    [ErrorCode.ENTITY_RELATION_INVALID]: 'A referenced relation is invalid.',

    [ErrorCode.REGISTRATION_DISABLED]: 'Registration is currently disabled.',
    [ErrorCode.PASSWORD_RECOVERY_DISABLED]: 'Password recovery is currently disabled.',
    [ErrorCode.EMAIL_VERIFICATION_REQUIRED]: 'Your email address must be verified first.',
    [ErrorCode.RESET_TOKEN_EXPIRED]: 'The reset token has expired. Please request a new one.',

    [ErrorCode.STORAGE_INSUFFICIENT]: 'There is not enough storage available to complete this action.',

    [ErrorCode.JWK_INVALID]: 'The JSON web key is invalid.',
    [ErrorCode.JWK_NOT_FOUND]: 'The JSON web key could not be found.',

    [ErrorCode.JWT_INVALID]: 'The token is invalid.',
    [ErrorCode.JWT_INACTIVE]: 'The token is not active yet.',
    [ErrorCode.JWT_EXPIRED]: 'The token has expired. Please sign in again.',

    [ErrorCode.OAUTH_REDIRECT_URI_MISMATCH]: 'The redirect URI does not match.',
    [ErrorCode.OAUTH_CLIENT_INVALID]: 'The client is invalid.',
    [ErrorCode.OAUTH_GRANT_INVALID]: 'The authorization grant is invalid.',
    [ErrorCode.OAUTH_GRANT_TYPE_UNSUPPORTED]: 'The grant type is not supported.',
    [ErrorCode.OAUTH_REQUEST_INVALID]: 'The request is invalid.',
    [ErrorCode.OAUTH_LOGIN_REQUIRED]: 'You must sign in to continue.',
    [ErrorCode.OAUTH_INTERACTION_REQUIRED]: 'Interaction is required to continue.',
    [ErrorCode.OAUTH_ACCOUNT_SELECTION_REQUIRED]: 'Please select an account to continue.',
    [ErrorCode.OAUTH_CONSENT_REQUIRED]: 'Your consent is required to continue.',
    [ErrorCode.OAUTH_RESPONSE_TYPE_UNSUPPORTED]: 'The response type is not supported.',
    [ErrorCode.OAUTH_SCOPE_INVALID]: 'The requested scope is invalid.',
    [ErrorCode.OAUTH_SCOPE_INSUFFICIENT]: 'The granted scope is insufficient for this action.',

    [ErrorCode.PERMISSION_NOT_FOUND]: 'The permission could not be found.',
    [ErrorCode.PERMISSION_DENIED]: 'You do not have permission to perform this action.',
    [ErrorCode.PERMISSION_EVALUATION_FAILED]: 'The permission could not be evaluated.',

    [ErrorCode.POLICY_EVALUATOR_NOT_FOUND]: 'No evaluator was found for this policy.',
    [ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE]: 'This policy could not be processed.',
    [ErrorCode.POLICY_EVALUATOR_CONTEXT_INVALID]: 'The policy evaluation context is invalid.',
};
