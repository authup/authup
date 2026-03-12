# Lists

The package contains a **list** component for the following resources:

`General`
- **Clients**
- **ClientScopes**
- **IdentityProviders**
- **Permissions**
- **Realms**
- **Robots**
- **Roles**
- **Scopes**
- **ScopeClients**
- **AUsers**

`Assignment`
- **IdentityProviderRoleAssignments**
- **PermissionRobotAssignments**
- **PermissionRoleAssignments**
- **PermissionUserAssignments**
- **RobotPermissionAssignments**
- **RobotRoleAssignments**
- **RolePermissionAssignments**
- **RoleRobotAssignments**
- **RoleUserAssignments**
- **UserPermissionAssignments**
- **UserRoleAssignments**

## Usage

```vue
<script>
    import { defineComponent } from 'vue';
    import { 
        ASearch,
        ATitle,
        APagination,
        AUsers 
    } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            ASearch,
            ATitle,
            APagination,
            AUsers
        },
        setup() {
            const query = {
                sort: {
                    name: 'ASC'
                },
                pagination: {
                    limit: 10,
                    offset: 0
                }
            }

            return {
                query
            }
        }
    })
</script>
<template>
    <AUsers :query="query">
        <template #header="props">
            <ListHeader text="AUsers" />

            <ASearch
                :busy="props.busy"
                :load="props.load"
                :meta="props.meta"
            />
        </template>
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :load="props.load"
                :meta="props.meta"
            />
        </template>
        <template #body="props">
            <ul>
                <template v-for="entity in props.data" :key="entity.id">
                    <li>
                        {{entity.name}}
                    </li>
                </template>
            </ul>
        </template>
    </AUsers>
</template>
```

## Props

**`header`**

Disable the header section.

**`footer`**

Disable the footer section.

**`noMore`**

Disable the no more items section.

**`loading`**

Disable the loading section.

**`query`**

The query prop has the following parameters:
- **fields**: Return only specific resource fields or extend the default selection
- **filters**: Filter the resources, according to specific criteria.
- **relations**: Include related resources of the primary resource.
- **pagination**: Limit the number of resources returned from the entire collection.
- **sort**: Sort the resources according to one or more keys in asc/desc direction.

::: tip
For this purpose [rapiq](https://github.com/tada5hi) is used.
Visit the documentation for more details about the parameters and the scheme.
:::

## Slots

**`body`**

```vue
<script>
    import { defineComponent } from 'vue';
    import { AUsers } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUsers
        }
    })
</script>
<template>
    <AUsers>
        <template #body="props">
            <ul>
                <template v-for="entity in props.data" :key="entity.id">
                    <li>
                        {{entity.name}}
                    </li>
                </template>
            </ul>
        </template>
    </AUsers>
</template>
```

**`header`**

```vue
<script>
    import { defineComponent } from 'vue';
    import { AUsers } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUsers
        }
    })
</script>
<template>
    <AUsers>
        <template #header="props">
            <button
                type="button"
                @click="props.load()"
                :disabled="props.busy"
            >
                Refresh
            </button>
        </template>
    </AUsers>
</template>
```

**`footer`**

```vue
<script>
    import { defineComponent } from 'vue';
    import { AUsers } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUsers
        }
    })
</script>
<template>
    <AUsers>
        <template #footer="props">
            <button
                type="button"
                @click="props.load()"
                :disabled="props.busy"
            >
                Refresh
            </button>
        </template>
    </AUsers>
</template>
```

**`loading`**

```vue
<script>
    import { defineComponent } from 'vue';
    import { AUsers } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUsers
        }
    })
</script>
<template>
    <AUsers>
        <template #loading="props">
            Loading resources...
        </template>
    </AUsers>
</template>
```


**`noMore`**

```vue
<script>
    import { defineComponent } from 'vue';
    import { AUsers } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUsers
        }
    })
</script>
<template>
    <AUsers>
        <template #no-more="props">
            No more resources available...
        </template>
    </AUsers>
</template>
```
