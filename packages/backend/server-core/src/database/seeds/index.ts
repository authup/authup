/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource, In } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import {
    MASTER_REALM_ID,
    Permission,
    PermissionID,
    Robot,
    RobotPermission,
    RolePermission,
    User,
    UserRole,
    createNanoID,
} from '@authelion/common';
import { hash } from '@authelion/server-utils';
import {
    PermissionEntity,
    RealmEntity, RobotEntity, RobotPermissionEntity,
    RoleEntity,
    RolePermissionEntity,
    UserRepository,
    UserRoleEntity,
    useRobotEventEmitter,
} from '../../domains';
import { DatabaseSeedOptions } from '../type';
import { useConfig } from '../../config';
import { buildDatabaseOptionsFromConfig } from '../options';

export type DatabaseRootSeederRunResponse = {
    robot?: Robot,
    user?: User
};

function getPermissions(options: DatabaseSeedOptions) {
    return Array.from(new Set([
        ...Object.values(PermissionID),
        ...(options.permissions ? options.permissions : []),
    ]));
}

export class DatabaseSeeder implements Seeder {
    protected options?: DatabaseSeedOptions;

    constructor(options?: DatabaseSeedOptions) {
        this.options = options;
    }

    public async run(dataSource: DataSource) : Promise<any> {
        const { options } = this;

        if (!options) {
            const config = await useConfig();
            const databaseOptions = buildDatabaseOptionsFromConfig(config);
            this.options = databaseOptions.seed;
        }

        const response : DatabaseRootSeederRunResponse = {};

        /**
         * Create default realm
         */
        const realmRepository = dataSource.getRepository(RealmEntity);
        let realm = await realmRepository.findOneBy({
            name: MASTER_REALM_ID,
        });

        if (!realm) {
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
        const roleRepository = dataSource.getRepository(RoleEntity);
        let role = await roleRepository.findOneBy({
            name: 'admin',
        });
        if (!role) {
            role = roleRepository.create({
                name: 'admin',
            });
        }

        await roleRepository.save(role);

        // -------------------------------------------------

        /**
         * Create default user
         */
        const userRepository = new UserRepository(dataSource);
        let user = await userRepository.findOneBy({
            name: options.admin.username,
        });

        if (!user) {
            user = userRepository.create({
                name: options.admin.username,
                password: await hash(options.admin.password || 'start123'),
                email: 'peter.placzek1996@gmail.com',
                realm_id: MASTER_REALM_ID,
                active: true,
            });

            response.user = user;
        } else if (options.admin.passwordReset) {
            user.password = await hash(options.admin.password || 'start123');
            user.active = true;
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

        const userRoleRepository = dataSource.getRepository(UserRoleEntity);
        let userRole = await userRoleRepository.findOneBy(userRoleData);

        if (!userRole) {
            userRole = userRoleRepository.create(userRoleData);
        }

        await userRoleRepository.save(userRole);

        // -------------------------------------------------

        /**
         * Create all permissions
         */
        let permissionIds : string[] = getPermissions(options);

        const permissionRepository = dataSource.getRepository(PermissionEntity);

        const existingPermissions = await permissionRepository.findBy({
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
        permissionIds = getPermissions(options);
        const rolePermissionRepository = dataSource.getRepository(RolePermissionEntity);

        const existingRolePermissions = await rolePermissionRepository.findBy({
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
        const robotRepository = dataSource.getRepository<Robot>(RobotEntity);
        let robot = await robotRepository.findOneBy({
            name: 'SYSTEM',
        });

        const secret = options.robot.secret || createNanoID(undefined, 64);
        if (!robot) {
            robot = robotRepository.create({
                name: 'SYSTEM',
                realm_id: MASTER_REALM_ID,
                secret: await hash(secret),
            });

            await robotRepository.save(robot);

            robot.secret = secret;
            response.robot = robot;
        } else if (options.robot.secretReset) {
            robot.secret = await hash(secret);

            await robotRepository.save(robot);

            robot.secret = secret;
            response.robot = robot;
        }

        useRobotEventEmitter()
            .emit('credentials', {
                ...robot,
                secret,
            });

        // -------------------------------------------------

        /**
         * Assign all permissions to default robot.
         */
        permissionIds = getPermissions(options);
        const robotPermissionRepository = dataSource.getRepository(RobotPermissionEntity);

        const existingRobotPermissions = await robotPermissionRepository.findBy({
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
