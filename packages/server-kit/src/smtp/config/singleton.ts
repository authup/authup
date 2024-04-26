/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SMTPOptions } from '../type';

let instance : SMTPOptions | string | undefined;

export function hasSmtpConfig() {
    return !!instance;
}

export function setSmtpConfig(value: SMTPOptions | string | undefined) {
    instance = value;
}

export function useSmtpConfig() : SMTPOptions | string {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = {};

    return instance;
}
