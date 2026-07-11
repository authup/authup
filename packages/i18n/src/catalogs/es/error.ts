/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationErrorSpanish : NamespaceTranslations<`${ErrorCode}`> = {
    [ErrorCode.BAD_REQUEST]: 'No se pudo procesar la solicitud.',
    [ErrorCode.INTERNAL_ERROR]: 'Se produjo un error inesperado. Inténtelo de nuevo más tarde.',

    [ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED]: 'El tipo de encabezado de autorización no es compatible.',
    [ErrorCode.HTTP_BEARER_TOKEN_MALFORMED]: 'El token bearer tiene un formato incorrecto.',

    [ErrorCode.IDENTITY_UNAUTHORIZED]: 'No está autenticado.',

    [ErrorCode.ENTITY_CREDENTIALS_INVALID]: 'Las credenciales proporcionadas no son válidas.',
    [ErrorCode.ENTITY_INACTIVE]: 'La entidad está inactiva.',
    [ErrorCode.ENTITY_NOT_FOUND]: 'No se pudo encontrar la entidad solicitada.',
    [ErrorCode.ENTITY_CONFLICT]: 'Ya existe una entidad con estos datos.',
    [ErrorCode.ENTITY_RELATION_INVALID]: 'Una relación referenciada no es válida.',

    [ErrorCode.REGISTRATION_DISABLED]: 'El registro está deshabilitado actualmente.',
    [ErrorCode.PASSWORD_RECOVERY_DISABLED]: 'La recuperación de contraseña está deshabilitada actualmente.',
    [ErrorCode.EMAIL_VERIFICATION_REQUIRED]: 'Primero debe verificar su dirección de correo electrónico.',
    [ErrorCode.RESET_TOKEN_EXPIRED]: 'El token de restablecimiento ha caducado. Solicite uno nuevo.',

    [ErrorCode.STORAGE_INSUFFICIENT]: 'No hay suficiente almacenamiento disponible para completar esta acción.',

    [ErrorCode.JWK_INVALID]: 'La clave web JSON no es válida.',
    [ErrorCode.JWK_NOT_FOUND]: 'No se pudo encontrar la clave web JSON.',

    [ErrorCode.JWT_INVALID]: 'El token no es válido.',
    [ErrorCode.JWT_INACTIVE]: 'El token aún no está activo.',
    [ErrorCode.JWT_EXPIRED]: 'El token ha caducado. Inicie sesión de nuevo.',

    [ErrorCode.OAUTH_REDIRECT_URI_MISMATCH]: 'La URI de redirección no coincide.',
    [ErrorCode.OAUTH_CLIENT_INVALID]: 'El cliente no es válido.',
    [ErrorCode.OAUTH_CLIENT_UNAUTHORIZED]: 'El cliente no está autorizado para usar este tipo de concesión.',
    [ErrorCode.OAUTH_GRANT_INVALID]: 'La concesión de autorización no es válida.',
    [ErrorCode.OAUTH_GRANT_TYPE_UNSUPPORTED]: 'El tipo de concesión no es compatible.',
    [ErrorCode.OAUTH_REQUEST_INVALID]: 'La solicitud no es válida.',
    [ErrorCode.OAUTH_LOGIN_REQUIRED]: 'Debes iniciar sesión para continuar.',
    [ErrorCode.OAUTH_INTERACTION_REQUIRED]: 'Se requiere interacción para continuar.',
    [ErrorCode.OAUTH_ACCOUNT_SELECTION_REQUIRED]: 'Selecciona una cuenta para continuar.',
    [ErrorCode.OAUTH_CONSENT_REQUIRED]: 'Se requiere tu consentimiento para continuar.',
    [ErrorCode.OAUTH_RESPONSE_TYPE_UNSUPPORTED]: 'El tipo de respuesta no es compatible.',
    [ErrorCode.OAUTH_SCOPE_INVALID]: 'El ámbito solicitado no es válido.',
    [ErrorCode.OAUTH_SCOPE_INSUFFICIENT]: 'El ámbito concedido es insuficiente para esta acción.',

    [ErrorCode.PERMISSION_NOT_FOUND]: 'No se pudo encontrar el permiso.',
    [ErrorCode.PERMISSION_DENIED]: 'No tiene permiso para realizar esta acción.',
    [ErrorCode.PERMISSION_EVALUATION_FAILED]: 'No se pudo evaluar el permiso.',

    [ErrorCode.POLICY_EVALUATOR_NOT_FOUND]: 'No se encontró ningún evaluador para esta política.',
    [ErrorCode.POLICY_EVALUATOR_NOT_PROCESSABLE]: 'No se pudo procesar esta política.',
    [ErrorCode.POLICY_EVALUATOR_CONTEXT_INVALID]: 'El contexto de evaluación de la política no es válido.',
};
