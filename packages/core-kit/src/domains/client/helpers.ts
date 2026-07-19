/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NameValidOptions } from '../../helpers';
import { isNameValid } from '../../helpers';
import { CLIENT_CERTIFICATE_URI_PREFIX, ClientAuthMethod } from './constants';
import type { Client } from './entity';

export function isClientNameValid(name: string, options: NameValidOptions = {}) : boolean {
    return isNameValid(name, options);
}

export function isClientPublic(client: Pick<Client, 'authMethod'>): boolean {
    return client.authMethod === ClientAuthMethod.NONE;
}

export function buildClientCertificateURI(clientId: string): string {
    return `${CLIENT_CERTIFICATE_URI_PREFIX}${clientId}`;
}
