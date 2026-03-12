# Seeds

Database seeding is part of the server-core application and is located in
`apps/server-core/src/app/modules/provisioning/`. It is no longer available as a
standalone `@authup/server-database` package export.

The seeding process populates the database with an initial data set (user, role, ...):
- User: admin
- Role: admin
- Permission(s): user_add, user_edit, ...

It also creates all possible relations between the following entities:
- user - role
- role - permissions
