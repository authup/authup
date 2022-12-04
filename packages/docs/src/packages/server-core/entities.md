# Entities

## Defining Relations

To define a database ([typeorm](https://typeorm.io/)) relation to an entity of this package,
import the [entity](#available-entities) and define a one-to-one, many-to-one, one-to-many or many-to-many relation as usual.
Database entities are always suffixed with the `Entity` keyword.

::: warning Info
Follow the [Database](database.md) step of the `Getting Started` guide first, to set the database entities for the database connection.
:::

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

## Available

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
