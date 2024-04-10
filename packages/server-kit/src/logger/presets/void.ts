/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '../type';

export class VoidLogger implements Logger {
    error(message: any) : any;

    error(message: string, ...meta: any[]) : any;

    error() {
        return this;
    }

    // ---------------------------------------------

    warn(message: any) : any;

    warn(message: string, ...meta: any[]) : any;

    warn() {
        return this;
    }

    // ---------------------------------------------

    info(message: any) : any;

    info(message: string, ...meta: any[]) : any;

    info() {
        return this;
    }

    // ---------------------------------------------

    http(message: any) : any;

    http(message: string, ...meta: any[]) : any;

    http() {
        return this;
    }

    // ---------------------------------------------

    verbose(message: any) : any;

    verbose(message: string, ...meta: any[]) : any;

    verbose() {
        return this;
    }

    // ---------------------------------------------

    debug(message: any) : any;

    debug(message: string, ...meta: any[]) : any;

    debug() {
        return this;
    }

    // ---------------------------------------------
}
