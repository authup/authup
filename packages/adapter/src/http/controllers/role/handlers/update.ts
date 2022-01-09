import { getRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { check, matchedData, validationResult } from 'express-validator';
import { PermissionID, Role } from '@typescript-auth/domains';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError } from '../../../error/validation';

export async function updateRoleRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const { id } = req.params;

    if (!req.ability.hasPermission(PermissionID.ROLE_EDIT)) {
        throw new NotFoundError();
    }

    await check('name')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 30 })
        .optional()
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedData(req, { includeOptionals: true });
    if (!data) {
        return res.respondAccepted();
    }

    const roleRepository = getRepository(Role);
    let role = await roleRepository.findOne(id);

    if (typeof role === 'undefined') {
        throw new NotFoundError();
    }

    role = roleRepository.merge(role, data);

    const result = await roleRepository.save(role);

    return res.respondAccepted({
        data: result,
    });
}
