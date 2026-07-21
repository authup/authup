# Introduction

The **Developer Guide** is designed to help you get started with **Authup**, 
whether you're looking to contribute to the project,
integrate it into your own system, or understand basic workflows. 
It is divided into the following sections:

- **Integration**: Instructions on how to integrate Authup into your system, including SDKs and example projects.
- **Workflows**: An overview of core workflows.

If you're looking to contribute to the Authup ecosystem, we welcome your input! 
Whether you're fixing bugs, suggesting features, or improving documentation, your contributions help make Authup better.
Before you start contributing, please make sure to review the following:
- [Code of Conduct](code-of-conduct.md) – Understand the community guidelines.
- [Submission Guidelines](submission-guidelines.md) – Follow the process for submitting your contributions.
- [Repository Structure](./repository-structure.md) -  Familiarize yourself with the project structure and how the packages are organized.

Once you're ready, you can proceed to the [Quick Start](./quick-start.md) section to set up your local 
development environment and begin working with Authup,
either by integrating it into your systems or contributing to the project.

## Diving into the codebase

Once your environment runs, two resources explain how the system is built:

- The **Internals** section of this guide (see the sidebar) walks through the
  server-side building blocks — [controllers](../contributing/controllers.md),
  [middlewares](../contributing/middlewares.md), the
  [policy engine](../contributing/policy-engine.md), the
  [database layer](../contributing/database-entities.md) and the shared
  [server-kit primitives](../contributing/shared-core-types.md) — plus the
  [test kit](../contributing/test-kit.md) used across the server-side test suites.
- The repository's agent documentation
  ([`AGENTS.md`](https://github.com/authup/authup/blob/master/AGENTS.md) and
  [`.agents/*.md`](https://github.com/authup/authup/tree/master/.agents)) is the
  always-current, in-depth reference for the architecture, conventions and testing
  setup. It is maintained alongside every change — when this guide and `.agents/`
  disagree, `.agents/` wins.



