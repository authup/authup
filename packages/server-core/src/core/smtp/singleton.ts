/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Factory } from 'singa';
import { singa } from 'singa';
import type { SMTPClient } from './type';

const instance = singa<SMTPClient>({
    name: 'smtp',
});

export function setSMTPClientFactory(factory: Factory<SMTPClient>) {
    instance.setFactory(factory);
}

export function isSMTPClientUsable() {
    return instance.has() || instance.hasFactory();
}

export function useSMTPClient() {
    return instance.use();
}
