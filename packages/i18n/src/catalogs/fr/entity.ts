/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { definePlural } from 'ilingo';
import { TranslatorTranslationEntityKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationEntityFrench : NamespaceTranslations<`${TranslatorTranslationEntityKey}`> = {
    [TranslatorTranslationEntityKey.CLIENT]: definePlural({ one: 'Client', other: 'Clients' }),
    [TranslatorTranslationEntityKey.CONSENT]: definePlural({ one: 'Consentement', other: 'Consentements' }),
    [TranslatorTranslationEntityKey.EVENT]: definePlural({ one: 'Événement', other: 'Événements' }),
    [TranslatorTranslationEntityKey.IDENTITY_PROVIDER]: definePlural({ one: 'Fournisseur d\'identité', other: 'Fournisseurs d\'identité' }),
    [TranslatorTranslationEntityKey.KEY]: definePlural({ one: 'Clé', other: 'Clés' }),
    [TranslatorTranslationEntityKey.PERMISSION]: definePlural({ one: 'Permission', other: 'Permissions' }),
    [TranslatorTranslationEntityKey.POLICY]: definePlural({ one: 'Politique', other: 'Politiques' }),
    [TranslatorTranslationEntityKey.REALM]: definePlural({ one: 'Domaine', other: 'Domaines' }),
    [TranslatorTranslationEntityKey.ROBOT]: definePlural({ one: 'Robot', other: 'Robots' }),
    [TranslatorTranslationEntityKey.ROLE]: definePlural({ one: 'Rôle', other: 'Rôles' }),
    [TranslatorTranslationEntityKey.SCOPE]: definePlural({ one: 'Portée', other: 'Portées' }),
    [TranslatorTranslationEntityKey.SESSION]: definePlural({ one: 'Session', other: 'Sessions' }),
    [TranslatorTranslationEntityKey.TRUST_ANCHOR]: definePlural({ one: 'Autorité de certification approuvée', other: 'Autorités de certification approuvées' }),
    [TranslatorTranslationEntityKey.USER]: definePlural({ one: 'Utilisateur', other: 'Utilisateurs' }),
};
