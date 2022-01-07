/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { generateKeyPair } from 'crypto';
import fs from 'fs';
import path from 'path';
import { SecurityKeyPair, SecurityKeyPairOptions } from './type';

const DEFAULT_ALIAS = 'default';
const keyPairCache : Record<string, SecurityKeyPair> = {};

function buildKeyFileName(type: 'private' | 'public', alias?: string) {
    alias = alias ?? DEFAULT_ALIAS;

    return `${(alias === DEFAULT_ALIAS ? '' : `${alias}.`) + type}.key`;
}

function buildOptions(options?: SecurityKeyPairOptions) : SecurityKeyPairOptions {
    options = options ?? {};
    options.alias = options.alias ?? DEFAULT_ALIAS;
    options.directory = options.directory ?? process.cwd();
    options.directory = path.isAbsolute(options.directory) ?
        options.directory :
        path.resolve(process.cwd(), options.directory);

    return options as SecurityKeyPairOptions;
}

export * from './type';

export async function createSecurityKeyPair(options?: SecurityKeyPairOptions) : Promise<SecurityKeyPair> {
    options = buildOptions(options);

    if (Object.prototype.hasOwnProperty.call(keyPairCache, options.alias)) {
        return keyPairCache[options.alias];
    }

    const securityKeyPair : SecurityKeyPair = await new Promise((resolve: (value: SecurityKeyPair) => void, reject) => {
        generateKeyPair('rsa', {
            modulusLength: 2048,
        }, (err, publicKey, privateKey) => {
            if (err) reject(err);

            resolve({
                privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
                publicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
            });
        });
    });

    await Promise.all(
        [
            { path: path.resolve(options.directory, buildKeyFileName('private', options.alias)), content: securityKeyPair.privateKey },
            { path: path.resolve(options.directory, buildKeyFileName('public', options.alias)), content: securityKeyPair.publicKey },
        ]
            .map((file) => fs.promises.writeFile(file.path, file.content)),
    );

    keyPairCache[options.alias] = securityKeyPair;

    return securityKeyPair;
}

export async function useSecurityKeyPair(options?: SecurityKeyPairOptions) : Promise<SecurityKeyPair> {
    options = buildOptions(options);

    if (Object.prototype.hasOwnProperty.call(keyPairCache, options.alias)) {
        return keyPairCache[options.alias];
    }

    const privateKeyPath : string = path.resolve(options.directory, buildKeyFileName('private', options.alias));
    const publicKeyPath : string = path.resolve(options.directory, buildKeyFileName('public', options.alias));

    try {
        await Promise.all([privateKeyPath, publicKeyPath].map((filePath) => fs.promises.stat(filePath)));
    } catch (e) {
        return createSecurityKeyPair(options);
    }

    const filesContent : Buffer[] = await Promise.all([privateKeyPath, publicKeyPath].map((filePath) => fs.promises.readFile(filePath)));

    const privateKey : string = filesContent[0].toString();
    const publicKey : string = filesContent[1].toString();

    keyPairCache[options.alias] = {
        privateKey,
        publicKey,
    };

    return {
        privateKey,
        publicKey,
    };
}
