/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

declare module '*.svg' {
    // It's really a string, precisely a resolved path pointing to the image file
    const filePath: string;

    export default filePath;
}
