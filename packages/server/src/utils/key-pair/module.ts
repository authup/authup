/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { generateKeyPair } from 'crypto';
import path from 'path';
import fs from 'fs';
import { KeyPairOptions, SecurityKeyPair } from './type';
import { buildKeyFileName, buildKeyPairOptions } from './utils';

const keyPairCache : Record<string, SecurityKeyPair> = {};

export async function createKeyPair(options?: Partial<KeyPairOptions>) : Promise<SecurityKeyPair> {
    options = buildKeyPairOptions(options);

    if (Object.prototype.hasOwnProperty.call(keyPairCache, options.alias)) {
        return keyPairCache[options.alias];
    }

    const securityKeyPair : SecurityKeyPair = await new Promise((resolve: (value: SecurityKeyPair) => void, reject) => {
        generateKeyPair(
            'rsa',
            options.rsa,
            (err, publicKey, privateKey) => {
                if (err) reject(err);

                resolve({
                    privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
                    publicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
                });
            },
        );
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

export async function useKeyPair(options?: Partial<KeyPairOptions>) : Promise<SecurityKeyPair> {
    options = buildKeyPairOptions(options);

    if (Object.prototype.hasOwnProperty.call(keyPairCache, options.alias)) {
        return keyPairCache[options.alias];
    }

    const privateKeyPath : string = path.resolve(options.directory, buildKeyFileName('private', options.alias));
    const publicKeyPath : string = path.resolve(options.directory, buildKeyFileName('public', options.alias));

    try {
        await Promise.all([privateKeyPath, publicKeyPath].map((filePath) => fs.promises.stat(filePath)));
    } catch (e) {
        return createKeyPair(options);
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
