import { ExpressRequest, ExpressResponse } from '../../../type';

export async function deleteTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    res.cookie('auth_token', null, { maxAge: 0 });
    return res.respondDeleted();
}
