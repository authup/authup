/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { KeyObject, generateKeyPair } from 'crypto';
import path from 'path';
import fs from 'fs';
import { KeyPair, KeyPairOptions } from './type';
import { buildKeyFileName, buildKeyPairOptions } from './utils';
import { KeyPairKind } from './constants';

const keyPairCache : Record<string, KeyPair> = {};

export async function createKeyPair(options?: Partial<KeyPairOptions>) : Promise<KeyPair> {
    options = buildKeyPairOptions(options);

    if (Object.prototype.hasOwnProperty.call(keyPairCache, options.alias)) {
        return keyPairCache[options.alias];
    }

    const keyPair : KeyPair = await new Promise((resolve: (value: KeyPair) => void, reject) => {
        const callback = (err: Error, publicKey: KeyObject, privateKey: KeyObject) => {
            if (err) reject(err);

            resolve({
                privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
                publicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
            });
        };

        const { generator } = options;

        switch (generator.type) {
            case 'dsa':
                generateKeyPair(
                    generator.type,
                    generator.options,
                    callback,
                );
                break;
            case 'ec':
                generateKeyPair(
                    generator.type,
                    generator.options,
                    callback,
                );
                break;
            case 'rsa':
                generateKeyPair(
                    generator.type,
                    generator.options,
                    callback,
                );
                break;
            case 'rsa-pss':
                generateKeyPair(
                    generator.type,
                    generator.options,
                    callback,
                );
                break;
        }
    });

    await Promise.all(
        [
            { path: path.resolve(options.directory, buildKeyFileName(KeyPairKind.PRIVATE, options.alias)), content: keyPair.privateKey },
            { path: path.resolve(options.directory, buildKeyFileName(KeyPairKind.PUBLIC, options.alias)), content: keyPair.publicKey },
        ]
            .map((file) => fs.promises.writeFile(file.path, file.content)),
    );

    keyPairCache[options.alias] = keyPair;

    return keyPair;
}

export async function useKeyPair(options?: Partial<KeyPairOptions>) : Promise<KeyPair> {
    options = buildKeyPairOptions(options);

    if (Object.prototype.hasOwnProperty.call(keyPairCache, options.alias)) {
        return keyPairCache[options.alias];
    }

    const privateKeyPath : string = path.resolve(options.directory, buildKeyFileName(KeyPairKind.PRIVATE, options.alias));
    const publicKeyPath : string = path.resolve(options.directory, buildKeyFileName(KeyPairKind.PUBLIC, options.alias));

    try {
        await Promise.all([privateKeyPath, publicKeyPath]
            .map((filePath) => fs.promises.stat(filePath)));
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
