/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { definePlural } from 'ilingo';
import { TranslatorTranslationEntityKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationEntitySpanish : NamespaceTranslations<`${TranslatorTranslationEntityKey}`> = {
    [TranslatorTranslationEntityKey.CLIENT]: definePlural({ one: 'Cliente', other: 'Clientes' }),
    [TranslatorTranslationEntityKey.CONSENT]: definePlural({ one: 'Consentimiento', other: 'Consentimientos' }),
    [TranslatorTranslationEntityKey.EVENT]: definePlural({ one: 'Evento', other: 'Eventos' }),
    [TranslatorTranslationEntityKey.IDENTITY_PROVIDER]: definePlural({ one: 'Proveedor de identidad', other: 'Proveedores de identidad' }),
    [TranslatorTranslationEntityKey.KEY]: definePlural({ one: 'Clave', other: 'Claves' }),
    [TranslatorTranslationEntityKey.PERMISSION]: definePlural({ one: 'Permiso', other: 'Permisos' }),
    [TranslatorTranslationEntityKey.POLICY]: definePlural({ one: 'Política', other: 'Políticas' }),
    [TranslatorTranslationEntityKey.REALM]: definePlural({ one: 'Dominio', other: 'Dominios' }),
    [TranslatorTranslationEntityKey.ROLE]: definePlural({ one: 'Rol', other: 'Roles' }),
    [TranslatorTranslationEntityKey.SCOPE]: definePlural({ one: 'Ámbito', other: 'Ámbitos' }),
    [TranslatorTranslationEntityKey.SESSION]: definePlural({ one: 'Sesión', other: 'Sesiones' }),
    [TranslatorTranslationEntityKey.SESSION_TOKEN]: definePlural({ one: 'Token de sesión', other: 'Tokens de sesión' }),
    [TranslatorTranslationEntityKey.TRUST_ANCHOR]: definePlural({ one: 'Autoridad de certificación de confianza', other: 'Autoridades de certificación de confianza' }),
    [TranslatorTranslationEntityKey.USER]: definePlural({ one: 'Usuario', other: 'Usuarios' }),
};
