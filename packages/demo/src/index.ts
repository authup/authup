import {config} from 'dotenv';

config();

import {createDatabase, dropDatabase} from "typeorm-extension";
import {createConnection} from "typeorm";
import {UserRole, UserRoleInterface} from "./domains/user/role";
import {Realm, RealmInterface} from "./domains/realm";
import {Permission, PermissionInterface} from "./domains/permission";
import {RolePermission, RolePermissionInterface} from "./domains/role/permission";
import {Role, RoleInterface} from "./domains/role";
import {User, UserInterface} from "./domains/user";
import {UserPermission, UserPermissionInterface} from "./domains/user/permission";

(async () => {
    await dropDatabase({ifExist: true});
    await createDatabase({ifNotExist: true});

    const connection = await createConnection();
    await connection.synchronize(true);

    // --------------------------------------------------------

    const realmRepository = connection.getRepository<RealmInterface>(Realm);

    const realmEntity = realmRepository.create({
        id: 'master',
        name: 'Master'
    });

    await realmRepository.save(realmEntity);

    // --------------------------------------------------------

    const userRepository = connection.getRepository<UserInterface>(User);

    const userEntity = userRepository.create({
        name: "Tadashi",
        realm_id: realmEntity.id
    });

    await userRepository.save(userEntity);
    // console.log(await repository.find({relations: ["user_roles"]}));

    // --------------------------------------------------------

    const permissionRepository = connection.getRepository<PermissionInterface>(Permission);

    const permissions = ['user_add', 'role_add'];
    for(let i=0; i<permissions.length; i++) {
        const permissionEntity = permissionRepository.create({
            id: permissions[i]
        });

        await permissionRepository.save(permissionEntity);
    }

    // --------------------------------------------------------

    const userPermissionRepository = connection.getRepository<UserPermissionInterface>(UserPermission);

    const userPermission = userPermissionRepository.create({
        user_id: userEntity.id,
        permission_id: 'user_add'
    });

    await userPermissionRepository.save(userPermission);

    // --------------------------------------------------------

    const roleRepository = connection.getRepository<RoleInterface>(Role);

    const roleEntity = roleRepository.create({
        name: "admin",
        realm_id: realmEntity.id
    });

    await roleRepository.save(roleEntity);

    // --------------------------------------------------------

    const rolePermissionRepository = connection.getRepository<RolePermissionInterface>(RolePermission);

    const rolePermission = rolePermissionRepository.create({
        role_id: roleEntity.id,
        permission_id: 'role_add'
    });

    await rolePermissionRepository.save(rolePermission);

    // --------------------------------------------------------

    const userRoleRepository = connection.getRepository<UserRoleInterface>(UserRole);

    const userRoleEntity = userRoleRepository.create({
        user_id: userEntity.id,
        role_id: roleEntity.id
    });

    await userRoleRepository.insert(userRoleEntity);

    process.exit(0);
})();
