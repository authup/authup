# Forms

The package contains a **form** component for the following resources:

`General`
- **AClientForm**
- **AIdentityProviderForm**
- **APermissionForm**
- **APolicyForm**
- **ARealmForm**
- **ARobotForm**
- **ARoleForm**
- **AScopeForm**
- **AUserForm**

These forms always represent a single resource.
They accept an `entity` prop to pass the resource data for editing.

## Usage

If the entity prop has no id parameter, the object is seen as a template for the form fields.

```vue
<script>
    import { defineComponent } from 'vue';
    import { AUserForm } from '@authup/client-web-kit';

    export default defineComponent({
        components: {
            AUserForm
        },
        setup() {
            const entity = {
                id: 'xxx',
                name: '...',
                // ...
            }
            
            const handleCreated = (entity) => {
                console.log(`The user ${entity.name} was created.`);
            }
            
            const handleUpdated = (entity) => {
                console.log(`The user ${entity.name} has been updated.`);
            }
            
            const handleFailed = (e) => {
                console.log(`Failed with: ${e.message}`);
            }

            return {
                entity,
                handleUpdated,
                handleCreated,
                handleFailed
            }
        }
    })
</script>
<template>
    <AUserForm 
        :entity="entity"
        @updated="handleUpdated"
        @created="handleCreated"
        @failed="handleFailed"
    >
        <!-- content -->
    </AUserForm>
</template>
```
