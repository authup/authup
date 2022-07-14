# Ability

## `Ability`

```typescript
export type Ability<T extends Record<string, any> = Record<any, any>> = AbilityID & AbilityDescriptor<T>;
```

**References**
- [AbilityId](#abilityid)
- [AbilityDescriptor](#abilitydescriptor)

## `AbilityID`

```typescript
export type AbilityID = {
    action: string,
    subject: string
};
```

## `AbilityDescriptor`

```typescript
import { MongoQuery } from '@ucast/mongo2js';

export type AbilityDescriptor<T extends Record<string, any> = Record<string, any>> = {
    id: string,
    inverse?: boolean,
    condition?: MongoQuery<T> | null,
    fields?: string[] | null,
    target?: string | null,
    power?: number | null
};
```
