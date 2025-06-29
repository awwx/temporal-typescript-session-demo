import { NativeConnection, Worker } from '@temporalio/worker';

async function run_light_worker(connection: NativeConnection) {
  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: 'light',
    workflowsPath: require.resolve('./workflows'),
  });

  await worker.run();
}

async function run() {
  const connection = await NativeConnection.connect({});

  try {
    await run_light_worker(connection);
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
