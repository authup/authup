import { sign, verify } from 'jsonwebtoken';
import {useSecurityKeyPair} from "../security/key-pair";
import {SecurityKeyPair} from "../security/key-pair/type";

export async function createToken(payload: Record<string, any>, maxAge: number = 3600) {
    const keyPair : SecurityKeyPair = useSecurityKeyPair();

    const token : string = await sign(payload, keyPair.privateKey, {
        expiresIn: maxAge,
        algorithm: 'RS256',
    })

    return {
        token: token,
        expiresIn: maxAge
    };
}

export async function verifyToken(token: string) : Promise<Record<string, any>> {
    const keyPair : SecurityKeyPair = useSecurityKeyPair();

    return <Record<string, any>> await verify(token, keyPair.publicKey, {
        algorithms: ['RS256']
    });
}
