/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationAppKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationAppSpanish : NamespaceTranslations<`${TranslatorTranslationAppKey}`> = {
    [TranslatorTranslationAppKey.HOME]: 'Inicio',
    [TranslatorTranslationAppKey.RESOURCES]: 'Recursos',
    [TranslatorTranslationAppKey.GENERAL]: 'General',
    [TranslatorTranslationAppKey.OTHER]: 'Otro',
    [TranslatorTranslationAppKey.SETTINGS]: 'Ajustes',
    [TranslatorTranslationAppKey.LOGOUT]: 'Cerrar sesión',
    [TranslatorTranslationAppKey.ACCOUNT]: 'Cuenta',
    [TranslatorTranslationAppKey.SECURITY]: 'Seguridad',

    [TranslatorTranslationAppKey.MANAGEMENT]: 'Gestión',
    [TranslatorTranslationAppKey.DETAILS]: 'Detalles',
    [TranslatorTranslationAppKey.SET_MANAGEMENT_REALM]: 'Establecer como realm de gestión',
    [TranslatorTranslationAppKey.API_DOCS]: 'Documentación de la API',
    [TranslatorTranslationAppKey.MADE_WITH]: 'Hecho con',

    [TranslatorTranslationAppKey.LOGIN_TITLE]: 'Iniciar sesión',
    [TranslatorTranslationAppKey.LOGIN_SUBTITLE]: 'Selecciona un realm para continuar',

    [TranslatorTranslationAppKey.URL_GENERATOR]: 'Generador de URL',
    [TranslatorTranslationAppKey.URL_GENERATOR_HINT]: 'Genere una URL de autorización eligiendo los ámbitos que necesita para funcionar.',
    [TranslatorTranslationAppKey.REDIRECT_URL]: 'URL de redirección',
    [TranslatorTranslationAppKey.GENERATED_URL]: 'URL generada',

    [TranslatorTranslationAppKey.TOGGLE_NAVIGATION]: 'Alternar navegación',

    [TranslatorTranslationAppKey.SESSION_RENEW]: 'La sesión se renovará en {countdown}.',
    [TranslatorTranslationAppKey.MINUTES]: 'minuto(s)',
    [TranslatorTranslationAppKey.SECONDS]: 'segundo(s)',

    [TranslatorTranslationAppKey.ENTITY_CREATED]: '{{entity}} se creó correctamente.',
    [TranslatorTranslationAppKey.ENTITY_UPDATED]: '{{entity}} se actualizó correctamente.',
    [TranslatorTranslationAppKey.ENTITY_DELETED]: '{{entity}} «{{name}}» se eliminó correctamente.',
    [TranslatorTranslationAppKey.ACCOUNT_UPDATED]: 'La cuenta se actualizó correctamente.',

    [TranslatorTranslationAppKey.DELETE_CONFIRM_TITLE]: '¿Eliminar {{entity}}?',
    [TranslatorTranslationAppKey.DELETE_CONFIRM_DESCRIPTION]: 'Esta acción no se puede deshacer.',

    [TranslatorTranslationAppKey.REMOVE_CONFIRM_TITLE]: 'Confirmar eliminación',
    [TranslatorTranslationAppKey.REMOVE_CONFIRM_DESCRIPTION]: '¿Seguro que quieres quitar esta asignación? Puedes volver a asignarla en cualquier momento.',

    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS]: 'Cerrar sesión en otros dispositivos',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_TITLE]: '¿Cerrar sesión en otros dispositivos?',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_DESCRIPTION]: 'Esto cierra todas tus otras sesiones. Tu sesión actual permanece activa.',
    [TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_SUCCESS]: '{{amount}} otra(s) sesión(es) cerradas.',

    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL]: 'Cerrar sesión en todas partes',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_TITLE]: '¿Cerrar la sesión de este usuario en todas partes?',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_DESCRIPTION]: 'Esto revoca todas las sesiones de este usuario en todos los dispositivos.',
    [TranslatorTranslationAppKey.SESSION_REVOKE_ALL_SUCCESS]: '{{amount}} sesión(es) cerradas.',

    [TranslatorTranslationAppKey.SESSION_CURRENT]: 'Este dispositivo',

    [TranslatorTranslationAppKey.AUTHENTICATOR]: 'Autenticadores',
    [TranslatorTranslationAppKey.MFA_SECURITY_TITLE]: 'Autenticación de dos factores',
    [TranslatorTranslationAppKey.MFA_SECURITY_HINT]: 'Añade una capa de seguridad adicional con una aplicación de autenticación o códigos de recuperación.',

    [TranslatorTranslationAppKey.APPLICATIONS]: 'Aplicaciones',
    [TranslatorTranslationAppKey.CONSENT_EMPTY]: 'Aún no has concedido acceso a ninguna aplicación.',
    [TranslatorTranslationAppKey.CONSENT_REVOKE]: 'Revocar',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL]: 'Revocar acceso',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_TITLE]: 'Revocar el acceso de la aplicación',
    [TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_DESCRIPTION]: 'La aplicación volverá a pedir tu consentimiento en el próximo inicio de sesión.',
    [TranslatorTranslationAppKey.CONSENT_SCOPES]: 'Permisos concedidos',
};
