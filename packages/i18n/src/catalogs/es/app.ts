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
    [TranslatorTranslationAppKey.API_DOCS]: 'Documentación de la API',

    [TranslatorTranslationAppKey.URL_GENERATOR]: 'Generador de URL',
    [TranslatorTranslationAppKey.URL_GENERATOR_HINT]: 'Genere una URL de autorización eligiendo los ámbitos que necesita para funcionar.',
    [TranslatorTranslationAppKey.REDIRECT_URL]: 'URL de redirección',
    [TranslatorTranslationAppKey.GENERATED_URL]: 'URL generada',

    [TranslatorTranslationAppKey.TOGGLE_NAVIGATION]: 'Alternar navegación',
    [TranslatorTranslationAppKey.SWITCH_TO_LIGHT_MODE]: 'Cambiar a modo claro',
    [TranslatorTranslationAppKey.SWITCH_TO_DARK_MODE]: 'Cambiar a modo oscuro',

    [TranslatorTranslationAppKey.SESSION_RENEW]: 'La sesión se renovará en',
    [TranslatorTranslationAppKey.MINUTES]: 'minuto(s)',
    [TranslatorTranslationAppKey.SECONDS]: 'segundo(s)',

    [TranslatorTranslationAppKey.ENTITY_CREATED]: '{{entity}} se creó correctamente.',
    [TranslatorTranslationAppKey.ENTITY_UPDATED]: '{{entity}} se actualizó correctamente.',
    [TranslatorTranslationAppKey.ENTITY_DELETED]: '{{entity}} «{{name}}» se eliminó correctamente.',
    [TranslatorTranslationAppKey.ACCOUNT_UPDATED]: 'La cuenta se actualizó correctamente.',
};
