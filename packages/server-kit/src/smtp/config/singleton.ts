/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SmtpConfig } from '../type';

let instance : SmtpConfig | string | undefined;

export function hasSmtpConfig() {
    return !!instance;
}

export function setSmtpConfig(value: SmtpConfig | string | undefined) {
    instance = value;
}

export function useSmtpConfig() : SmtpConfig | string {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = {};

    return instance;
}
