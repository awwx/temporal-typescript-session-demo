# Demo "Session" Implementation in Typescript

This is a demo implementation of the "session" algorithm as described by Maxim Fateev
in
https://community.temporal.io/t/does-temporal-typescript-support-workflow-session/15236/6 for Typescript.

We use a "light" task queue for the default, usual Temporal task queue (low CPU tasks, stateless, run multiple instances for availability).

Each "heavy" host for heavy, CPU or other resource intensive tasks
gets its own task queue named after the host.

Run in different windows:

- `npx ts-node src/light_worker.ts`
- `npx ts-node src/heavy_worker.ts heavy1`
- `npx ts-node src/heavy_worker.ts heavy2` ...

Where "heavy1" etc. is the "hostname" the worker would be running on
(in a real system we might use `os.hostname()`.

And then:

- `npx ts-node src/client.ts`
