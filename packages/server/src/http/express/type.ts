/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ExpressAppCreateContext = {
    writableDirectoryPath?: string,
    swaggerDocumentation?: boolean

    webUrl: string,
    selfUrl: string
};

export type ExpressAppMiddlewareOptions = {
    bodyParser?: boolean,
    cookieParser?: boolean,
    response?: boolean,
    auth?: boolean | {
        writableDirectoryPath?: string
    }
};
