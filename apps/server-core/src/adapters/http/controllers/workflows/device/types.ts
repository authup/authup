/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

export type DeviceControllerOptions = {
    /**
     * Where the auth console service renders the verification page this
     * controller hands over to.
     */
    authConsoleUrl: string,
};

export type DeviceControllerContext = {
    options: DeviceControllerOptions,
};
