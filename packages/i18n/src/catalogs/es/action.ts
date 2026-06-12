/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationActionKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationActionSpanish : NamespaceTranslations<`${TranslatorTranslationActionKey}`> = {
    [TranslatorTranslationActionKey.ADD]: 'Añadir',
    [TranslatorTranslationActionKey.CREATE]: 'Crear',
    [TranslatorTranslationActionKey.DELETE]: 'Eliminar',
    [TranslatorTranslationActionKey.GENERATE]: 'Generar',
    [TranslatorTranslationActionKey.UPDATE]: 'Actualizar',
    [TranslatorTranslationActionKey.AUTHORIZE]: 'Autorizar',
    [TranslatorTranslationActionKey.ABORT]: 'Cancelar',
    [TranslatorTranslationActionKey.LOGIN]: 'Iniciar sesión',

    [TranslatorTranslationActionKey.REGISTER]: 'Registrarse',
    [TranslatorTranslationActionKey.ACTIVATE]: 'Activar',
    [TranslatorTranslationActionKey.RESET]: 'Restablecer',
    [TranslatorTranslationActionKey.SEND]: 'Enviar',
    [TranslatorTranslationActionKey.BACK]: 'Atrás',
    [TranslatorTranslationActionKey.CLOSE]: 'Cerrar',
    [TranslatorTranslationActionKey.LOOKUP]: 'Buscar',
    [TranslatorTranslationActionKey.SHOW]: 'Mostrar',
    [TranslatorTranslationActionKey.HIDE]: 'Ocultar',
};
