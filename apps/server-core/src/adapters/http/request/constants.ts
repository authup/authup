/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum RequestHandlerOperation {
    COMMAND = 'command',
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
}

// The certificate-source vocabulary is declared with the `certificateSource`
// key it is the vocabulary of (in `@authup/server-config`), because the
// configuration document has to be describable without importing this
// service. Re-exported here so the request layer keeps one import path.
export { CERTIFICATE_SOURCES } from '@authup/server-config';
