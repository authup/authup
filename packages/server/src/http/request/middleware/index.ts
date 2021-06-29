import {Request, Response, NextFunction} from "express";
import {AbilityManager} from "@typescript-auth/core";

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

    }
}
