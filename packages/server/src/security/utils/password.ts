import {compare, hash} from "bcrypt";

export async function hashPassword(password: string, saltOrRounds: number | string = 10) : Promise<string> {
    return hash(password,saltOrRounds);
}

export async function verifyPassword(password: string, hash: string) : Promise<boolean> {
    return compare(password, hash);
}

