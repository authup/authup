import {sign, verify} from 'jsonwebtoken';
import {SecurityKeyPair, SecurityKeyPairOptions, useSecurityKeyPair} from "../key-pair";

export type SignedToken = {
    token: string,
    expiresIn: number
}

export async function createToken<T extends Record<string, any>>(payload: T, maxAge: number = 3600, keyPairOptions?: SecurityKeyPairOptions) : Promise<string> {
    const keyPair : SecurityKeyPair = await useSecurityKeyPair(keyPairOptions);

    return sign(payload, keyPair.privateKey, {
        expiresIn: maxAge,
        algorithm: 'RS256',
    });
}

export async function verifyToken<T extends Record<string, any>>(token: string, keyPairOptions?: SecurityKeyPairOptions) : Promise<T> {
    const keyPair : SecurityKeyPair = await useSecurityKeyPair(keyPairOptions);

    return await verify(token, keyPair.publicKey, {
        algorithms: ['RS256']
    }) as T;
}
