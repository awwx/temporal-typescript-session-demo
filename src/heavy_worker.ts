import { Client, Connection } from '@temporalio/client';
import { NativeConnection, Worker } from '@temporalio/worker';
import { UnlockReceived, HeavyHost } from "./types";
import { createProcessLockActivities, createHostSpecificActivities } from "./heavy_activities";

// In a real system we might use e.g. `os.hostname()` to get the
// hostname.  For the demo we'll get the hostname from the command line.

const hostname: string = process.argv[2] || (function () {
  throw new Error("usage: npx ts-code src/heavy_worker.ts <hostname>");
})();

async function temporalClient() {
  const connection = await Connection.connect({});
  return new Client({
    connection,
  });
}

async function run_heavy_worker(connection: NativeConnection) {
  const client = await temporalClient();

  const heavyHost: HeavyHost = {
    hostname,
    unlockReceived: {},
  };

  // All heavy workers listen to the "process-lock" queue.

  const process_lock_worker = await Worker.create({
    connection,
    taskQueue: 'process-lock',
    activities: createProcessLockActivities(client, heavyHost),

    // This sets how many workflows can lock the heavy worker
    // simultaneously.

    maxConcurrentActivityTaskExecutions: 2,
  });

  // And each heavy worker listens to its own queue, specific to the worker.

  const host_specific_worker = await Worker.create({
    connection,
    taskQueue: hostname,
    activities: createHostSpecificActivities(heavyHost),
  });

  await Promise.all([
    process_lock_worker.run(),
    host_specific_worker.run(),
  ]);
}

async function run() {
  const connection = await NativeConnection.connect({});

  try {
    await run_heavy_worker(connection);
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
