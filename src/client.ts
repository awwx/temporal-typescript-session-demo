import { Connection, Client } from '@temporalio/client';
import { use_heavy } from './workflows';
import { nanoid } from 'nanoid';

async function run() {
  const connection = await Connection.connect({});

  const client = new Client({
    connection,
  });

  const handle = client.workflow.start(use_heavy, {
    taskQueue: 'light',
    workflowId: nanoid(),
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
