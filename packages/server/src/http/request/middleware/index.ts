import {Request, Response, NextFunction} from "express";
import {AbilityManager} from "@typescript-auth/core";
import {TokenRequestError} from "../../error/token-request";

export type AuthMiddlewareOptions = {
    getTokenFromCookie?: (request: Request) => string | undefined
}

export function setupAuthMiddleware(middlewareOptions: AuthMiddlewareOptions) {
    return async (request: Request, response: Response, next: NextFunction) => {
        let { authorization } = request.headers;



        if(typeof middlewareOptions.getTokenFromCookie === 'function') {
            try {
                const cookieToken: string | undefined = middlewareOptions.getTokenFromCookie(request);
                if(typeof cookieToken === 'string') {
                    authorization = `Bearer ${cookieToken}`;
                }
            } catch (e) {
                // todo: handle unexpected position
            }
        }

        if(typeof authorization !== 'string') {
            (request as Record<string, any>).ability = new AbilityManager([]);

            next();
        }

        const parts : string[] = authorization.split(" ");

        if(parts.length !== 2) {
            throw TokenRequestError.formatInvalid();
        }

        const partsType :  string = parts[0].toLowerCase();
        if(['bearer', 'secret'].indexOf(partsType) === -1) {
            throw TokenRequestError.typeInvalid();
        }

        const type : 'bearer' | 'secret' = partsType as 'bearer' | 'secret';
        const id : string = parts[1];

        switch (type) {
            case "bearer":
                break;
            case "secret":
                break;
        }
    }
}
