/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Spinner = {
    start(text?: string): Spinner,
    succeed(text?: string): Spinner,
    stop(): Spinner,
    fail(text?: string): Spinner,
    warn(text?: string): Spinner,
    info(string?: string): Spinner,
    [key: string]: any,
};
