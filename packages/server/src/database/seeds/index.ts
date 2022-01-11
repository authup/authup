/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Connection, In } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import {
    MASTER_REALM_ID,
    Permission, PermissionID, Robot, RobotPermission, RolePermission, User, UserRole, createNanoID,
} from '@typescript-auth/domains';
import {
    PermissionEntity,
    RealmEntity, RobotEntity, RobotPermissionEntity,
    RolePermissionEntity,
    RoleRepository,
    UserRepository,
    UserRoleEntity,
} from '../../domains';
import { hashPassword } from '../../utils';

type DatabaseRootSeederOptions = {
    permissions?: string[],

    userName: string,
    userPassword: string,
    userPasswordReset?: boolean,

    robotSecretReset?: boolean
};

type DatabaseRootSeederRunResponse = {
    robot?: Robot,
    user?: User
};

function getPermissions(options: DatabaseRootSeederOptions) {
    return [
        ...Object.values(PermissionID),
        ...(options.permissions ? options.permissions : []),
    ];
}

class DatabaseRootSeeder implements Seeder {
    protected options: DatabaseRootSeederOptions;

    constructor(options: DatabaseRootSeederOptions) {
        this.options = options;
    }

    public async run(connection: Connection) : Promise<any> {
        const response : DatabaseRootSeederRunResponse = {};

        /**
         * Create default realm
         */
        const realmRepository = connection.getRepository(RealmEntity);
        let realm = await realmRepository.findOne({ name: MASTER_REALM_ID });
        if (typeof realm === 'undefined') {
            realm = realmRepository.create({
                id: MASTER_REALM_ID,
                name: 'Master',
                drop_able: false,
            });
        }

        await realmRepository.save(realm);

        // -------------------------------------------------

        /**
         * Create default role
         */
        const roleRepository = connection.getCustomRepository(RoleRepository);
        let role = await roleRepository.findOne({
            name: 'admin',
        });
        if (typeof role === 'undefined') {
            role = roleRepository.create({
                name: 'admin',
            });
        }

        await roleRepository.save(role);

        // -------------------------------------------------

        /**
         * Create default user
         */
        const userRepository = connection.getCustomRepository(UserRepository);
        let user = await userRepository.findOne({
            name: this.options.userName,
        });

        if (typeof user === 'undefined') {
            user = userRepository.create({
                name: this.options.userName,
                password: await hashPassword(this.options.userPassword),
                email: 'peter.placzek1996@gmail.com',
                realm_id: MASTER_REALM_ID,
            });

            response.user = user;
        } else if (this.options.userPasswordReset) {
            user.password = await hashPassword(this.options.userPassword);
        }

        await userRepository.save(user);
        // -------------------------------------------------

        /**
         * Create default user - role association
         */
        const userRoleData : Partial<UserRole> = {
            role_id: role.id,
            user_id: user.id,
        };

        const userRoleRepository = connection.getRepository(UserRoleEntity);
        let userRole = await userRoleRepository.findOne(userRoleData);

        if (typeof userRole === 'undefined') {
            userRole = userRoleRepository.create(userRoleData);
        }

        await userRoleRepository.save(userRole);

        // -------------------------------------------------

        /**
         * Create all permissions
         */
        let permissionIds : string[] = getPermissions(this.options);

        const permissionRepository = connection.getRepository(PermissionEntity);

        const existingPermissions = await permissionRepository.find({
            id: In(permissionIds),
        });

        for (let i = 0; i < existingPermissions.length; i++) {
            const index = permissionIds.indexOf(existingPermissions[i].id);
            if (index !== -1) {
                permissionIds.splice(index, 1);
            }
        }

        const permissions : Permission[] = permissionIds.map((id: string) => permissionRepository.create({ id }));
        if (permissions.length > 0) {
            await permissionRepository.save(permissions);
        }

        // -------------------------------------------------

        /**
         * Assign all permissions to default role.
         */
        permissionIds = getPermissions(this.options);
        const rolePermissionRepository = connection.getRepository(RolePermissionEntity);

        const existingRolePermissions = await rolePermissionRepository.find({
            permission_id: In(permissionIds),
            role_id: role.id,
        });

        for (let i = 0; i < existingRolePermissions.length; i++) {
            const index = permissionIds.indexOf(existingRolePermissions[i].permission_id);
            if (index !== -1) {
                permissionIds.splice(index, 1);
            }
        }

        const rolePermissions : RolePermission[] = [];
        for (let j = 0; j < permissionIds.length; j++) {
            rolePermissions.push(rolePermissionRepository.create({
                role_id: role.id,
                permission_id: permissionIds[j],
            }));
        }

        if (rolePermissions.length > 0) {
            await rolePermissionRepository.save(rolePermissions);
        }

        // -------------------------------------------------

        /**
         * Create default robot account
         */
        const robotRepository = connection.getRepository<Robot>(RobotEntity);
        let robot = await robotRepository.findOne({
            name: 'system',
        });

        if (typeof robot === 'undefined') {
            robot = robotRepository.create({
                name: 'system',
                realm_id: MASTER_REALM_ID,
            });

            const secret = createNanoID(undefined, 36);
            robot.secret = await hashPassword(secret);

            await robotRepository.save(robot);

            robot.secret = secret;
            response.robot = robot;
        } else if (this.options.robotSecretReset) {
            const secret = createNanoID(undefined, 36);
            robot.secret = await hashPassword(secret);

            await robotRepository.save(robot);

            robot.secret = secret;
            response.robot = robot;
        }

        // -------------------------------------------------

        /**
         * Assign all permissions to default robot.
         */
        permissionIds = getPermissions(this.options);
        const robotPermissionRepository = connection.getRepository(RobotPermissionEntity);

        const existingRobotPermissions = await robotPermissionRepository.find({
            permission_id: In(permissionIds),
            robot_id: robot.id,
        });

        for (let i = 0; i < existingRobotPermissions.length; i++) {
            const index = permissionIds.indexOf(existingRobotPermissions[i].permission_id);
            if (index !== -1) {
                permissionIds.splice(index, 1);
            }
        }

        const robotPermissions : RobotPermission[] = [];
        for (let j = 0; j < permissionIds.length; j++) {
            robotPermissions.push(robotPermissionRepository.create({
                robot_id: robot.id,
                permission_id: permissionIds[j],
            }));
        }

        if (robotPermissions.length > 0) {
            await robotPermissionRepository.save(robotPermissions);
        }

        return response;
    }
}

export {
    DatabaseRootSeeder,
    DatabaseRootSeederOptions,
};

export default DatabaseRootSeeder;
