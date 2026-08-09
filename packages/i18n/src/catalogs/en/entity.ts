/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { definePlural } from 'ilingo';
import { TranslatorTranslationEntityKey } from '../../constants';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationEntityEnglish : NamespaceTranslations<`${TranslatorTranslationEntityKey}`> = {
    [TranslatorTranslationEntityKey.CLIENT]: definePlural({ one: 'Client', other: 'Clients' }),
    [TranslatorTranslationEntityKey.CONSENT]: definePlural({ one: 'Consent', other: 'Consents' }),
    [TranslatorTranslationEntityKey.EVENT]: definePlural({ one: 'Event', other: 'Events' }),
    [TranslatorTranslationEntityKey.IDENTITY_PROVIDER]: definePlural({ one: 'Identity provider', other: 'Identity providers' }),
    [TranslatorTranslationEntityKey.IDENTITY_PROVIDER_ACCOUNT]: definePlural({ one: 'Connected account', other: 'Connected accounts' }),
    [TranslatorTranslationEntityKey.KEY]: definePlural({ one: 'Key', other: 'Keys' }),
    [TranslatorTranslationEntityKey.PERMISSION]: definePlural({ one: 'Permission', other: 'Permissions' }),
    [TranslatorTranslationEntityKey.POLICY]: definePlural({ one: 'Policy', other: 'Policies' }),
    [TranslatorTranslationEntityKey.REALM]: definePlural({ one: 'Realm', other: 'Realms' }),
    [TranslatorTranslationEntityKey.ROLE]: definePlural({ one: 'Role', other: 'Roles' }),
    [TranslatorTranslationEntityKey.SCOPE]: definePlural({ one: 'Scope', other: 'Scopes' }),
    [TranslatorTranslationEntityKey.SESSION]: definePlural({ one: 'Session', other: 'Sessions' }),
    [TranslatorTranslationEntityKey.TRUST_ANCHOR]: definePlural({ one: 'Trusted CA', other: 'Trusted CAs' }),
    [TranslatorTranslationEntityKey.USER]: definePlural({ one: 'User', other: 'Users' }),
};
