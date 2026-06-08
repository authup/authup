/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationClientKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationClientFrench : NamespaceTranslations<`${TranslatorTranslationClientKey}`> = {
    [TranslatorTranslationClientKey.NAME_HINT]: 'Quelque chose que les utilisateurs reconnaîtront et auquel ils feront confiance',
    [TranslatorTranslationClientKey.DESCRIPTION_HINT]: 'Affiché à tous les utilisateurs de cette application',
    [TranslatorTranslationClientKey.REDIRECT_URI_HINT]: 'Modèle d\'URI vers lequel un navigateur peut rediriger après une connexion réussie',
    [TranslatorTranslationClientKey.IS_CONFIDENTIAL]: 'Est confidentiel ?',
    [TranslatorTranslationClientKey.IS_ACTIVE]: 'Est actif ?',
    [TranslatorTranslationClientKey.HASH_SECRET]: 'Hacher le secret ?',

    [TranslatorTranslationClientKey.LOGIN_FAILED]: 'L\'opération de connexion a échoué',
    [TranslatorTranslationClientKey.SCOPE_GRANT_INTRO]: 'Cela permettra à l\'application {{client}} de',
    [TranslatorTranslationClientKey.ONCE_AUTHORIZED_REDIRECT]: 'Une fois autorisé, vous serez redirigé vers :',
    [TranslatorTranslationClientKey.GOVERNED_BY]: 'Cette application est régie par la politique de confidentialité et les conditions d\'utilisation de l\'application {{client}}.',
    [TranslatorTranslationClientKey.ACTIVE_SINCE]: 'Actif depuis',
    [TranslatorTranslationClientKey.VIEW_POLICY_DETAILS]: 'Voir les détails de la politique',
};
