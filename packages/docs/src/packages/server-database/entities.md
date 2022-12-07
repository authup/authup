# Entities
All domain entities, which can be managed by the REST-API, must be set for the DataSource.

::: warning Important

It is highly recommend to include the provided [subscribers](./subscribers.md),
to invalidate the entity cache for example, when caching is enabled.

:::

Therefore, use the utility function `setEntitiesForDataSourceOptions` to extend the typeorm DataSourceOptions.


```typescript
import {
    setEntitiesForDataSourceOptions
} from '@authup/server-core';

import { 
    DataSource,
    DataSourceOptions
} from 'typeorm';

(async () => {
    const options : DataSourceOptions = {
        // ...
    };

    // set entities
    setEntitiesForDataSourceOptions(options);

    // set subscribers
    /* ... */
    
    const dataSource = new DataSource(options);
    await dataSource.initialize();
    
    // run seed
    /* ... */
})();
```

The following entities are available:

- `OAuth2AccessTokenEntity`
- `OAuth2ClientEntity`
- `OAuth2ProviderEntity`
- `OAuth2ProviderAccountEntity`
- `OAuth2ProviderRoleEntity`
- `OAuth2RefreshTokenEntity`
- `PermissionEntity`
- `RealmEntity`
- `RobotEntity`
- `RobotPermissionEntity`
- `RobotRoleEntity`
- `RoleEntity`
- `RoleAttributeEntity`
- `RolePermissionEntity`
- `UserEntity`
- `UserAttributeEntity`
- `UserPermissionEntity`
- `UserRoleEntity`

## Relations

To define a database ([typeorm](https://typeorm.io/)) relation to an entity of this package,
import the entity and define a one-to-one, many-to-one, one-to-many or many-to-many relation as usual.
Database entities are always suffixed with the `Entity` keyword.

```typescript
import { User } from '@authup/common';
import { UserEntity } from '@authup/server-core';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: 'text'})
    text: string;

    @ManyToOne(() => UserEntity, { onDelete: 'cascade' })
    @JoinColumn({ name: 'realm_id' })
    user: UserEntity;
    
    @Column()
    user_id: User['id'];
}
```

