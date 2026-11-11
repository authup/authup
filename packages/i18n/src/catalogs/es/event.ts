/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationEventSpanish : NamespaceTranslations<`${EventName}`> = {
    [EventName.LOGIN]: 'Inicio de sesión',
    [EventName.LOGIN_FAILED]: 'Inicio de sesión fallido',
    [EventName.LOGOUT]: 'Cierre de sesión',
    [EventName.AUTHORIZE]: 'Aplicación autorizada',
    [EventName.AUTHORIZE_FAILED]: 'Autorización fallida',
    [EventName.REFRESH_REPLAY_DETECTED]: 'Reutilización de token de actualización detectada',
    [EventName.TOKEN_EXCHANGED]: 'Token intercambiado',
    [EventName.REGISTER]: 'Registro',
    [EventName.ACCOUNT_ACTIVATED]: 'Cuenta activada',
    [EventName.PASSWORD_RESET_REQUESTED]: 'Restablecimiento de contraseña solicitado',
    [EventName.PASSWORD_RESET_COMPLETED]: 'Restablecimiento de contraseña completado',
    [EventName.MFA_ENROLLED]: 'Segundo factor añadido',
    [EventName.MFA_REMOVED]: 'Segundo factor eliminado',
    [EventName.MFA_VERIFIED]: 'Segundo factor verificado',
    [EventName.MFA_CHALLENGE_FAILED]: 'Segundo factor fallido',
    [EventName.IDENTITY_PROVIDER_LINKED]: 'Cuenta de proveedor vinculada',
    [EventName.IDENTITY_PROVIDER_UNLINKED]: 'Cuenta de proveedor desvinculada',
    [EventName.BACKCHANNEL_LOGOUT]: 'Cierre de sesión back-channel',
    [EventName.BACKCHANNEL_LOGOUT_FAILED]: 'Cierre de sesión back-channel fallido',
    [EventName.CLIENT_SECRET_ROTATED]: 'Secreto de cliente rotado',
    [EventName.CREATED]: 'Creado',
    [EventName.UPDATED]: 'Actualizado',
    [EventName.DELETED]: 'Eliminado',
};
