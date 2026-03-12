# Records

The package contains a **record** component for the following resources:

`General`
- **AClient**
- **AClientScope**
- **AIdentityProvider**
- **APermission**
- **ARealm**
- **ARobot**
- **ARole**
- **AScope**
- **AScopeClient**
- **AUser**

These components always represent a single resource record. 
The criteria under which this can be requested by the API can be defined
with the help of component [props](#props).

In addition, the entity/object can be represented differently using template [slots](#slots).

## Props

**`entity`**

The entity prop can be used to directly provide the object instead of getting it from the API.

```vue
<script>
    import { defineComponent } from 'vue';
    import { AUser } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUser
        },
        setup() {
            const entity = {
                id: 'xxx',
                name: '...',
                // ...
            }

            return {
                entity
            }
        }
    })
</script>
<template>
    <AUser :entity="entity">
        <!-- content -->
    </AUser>
</template>
```

**`entityId`**

The entityId prop can be used to fetch a resource by its identifier from the API.

```vue

<script>
    import { defineComponent } from 'vue';
    import { AUser } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUser
        },
        setup() {
            const id = 'xxx';

            return {
                id
            }
        }
    })
</script>
<template>
    <AUser :entity-id="id">
        <!-- content -->
    </AUser>
</template>
```

**`queryFilters`**

The queryFilters prop can be used to fetch a resource by **one** or **multiple** conditions from the API.

```vue

<script>
    import { defineComponent } from 'vue';
    import { AUser } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUser
        },
        setup() {
            const queryFilters = {
                name: 'admin'
            };

            return {
                queryFilters
            }
        }
    })
</script>
<template>
    <AUser :query-filters="queryFilters">
        <!-- content -->
    </AUser>
</template>
```

**`queryFields`**

The queryFields prop cannot be used alone, 
as it only reduces the field set or includes fields that are not returned by default.

```vue

<script>
    import { defineComponent } from 'vue';
    import { AUser } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUser
        },
        setup() {
            const queryFilters = {
                name: 'admin'
            };
            
            const queryFields = ['email'];

            return {
                queryFilters,
                queryFields
            }
        }
    })
</script>
<template>
    <AUser 
        :query-filters="queryFilters" 
        :query-fields="queryFields"
    >
        <!-- content -->
    </AUser>
</template>
```

## Slots

### default

The default slot is rendered when the entity is resolved without an error.
The slot argument is of type EntityManagerSlotProps.

```vue
<template>
    <AUser :entity-id="id">
        <template #default="props">
            <!-- Display the entity props -->
            {{props.data}}
        </template>
    </AUser>
</template>
```

### error

The error slot is rendered when the entity resolved with an error.

```vue
<template>
    <AUser :entity-id="id">
        <template #error="error">
            {{ error.message }}
            <!-- The entity could not be resolved -->
        </template>
        <!-- content -->
    </AUser>
</template>
```

## Types

### `EntityManagerSlotProps`
```typescript
type EntityManagerSlotProps<T> = {
    busy: boolean,
    data: T | undefined,
    error: Error | undefined,
    lockId: EntityID<T> | undefined,
    create(entity: Partial<T>): Promise<void>,
    createOrUpdate(entity: Partial<T>) : Promise<void>,
    created(entity: T) : void,
    update(entity: Partial<T>) : Promise<void>,
    updated(entity: T) : void,
    delete() : Promise<void>,
    deleted(entity?: T) : void;
    failed(e: Error) : void;
    resolve(ctx?: EntityManagerResolveContext<T>) : Promise<void>;
    resolveOrFail(ctx?: EntityManagerResolveContext<T>) : Promise<void>;
};
```
