# Backend

The **server-core** extension package, which can be integrated into an existent application,
is the heart 🧡 of the authelion ecosystem and is used by the **server** package, to provide a standalone variant. 

Therefore, it is important to decide if a [standalone](#standalone) or [extension](#extension) solution for backend side
is the right choice.

## Extension or Standalone?

### Standalone

To use Authelion as standalone application, read the [server](../packages/server/index.md) package documentation for further usage.
There is also a docker image available for instant usage.

### Extension

To use Authelion as extension to an existent [express](https://expressjs.com/)- & [typeorm](https://typeorm.io/)-application,
read the [server-core](../packages/server-core/index.md) package documentation.

## Supporting Microservices

It is also possible to interact with the Authelion API from microservices.
Therefore, a [server-adapter](../packages/server-adapter/index.md) library is provided,
to simplify the verification and validation process of external access.
It provides a middleware for http & socket based microservices.
