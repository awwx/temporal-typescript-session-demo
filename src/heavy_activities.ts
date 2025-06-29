import { Context, heartbeat } from '@temporalio/activity';
import { Client, Connection } from '@temporalio/client';
import { UnlockReceived, HeavyHost, lockGranted } from './types';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const createProcessLockActivities = (client: Client, host: HeavyHost) => ({

  async lock_process(): Promise<void> {
    const callingWorkflowId = Context.current().info.workflowExecution.workflowId;

    console.log("start lock_process on", host.hostname, "called from workflow", callingWorkflowId);

    let resolveUnlockReceived: (() => void) | null = null;
    const unlockReceivedPromise = new Promise<void>((resolve) => {
      resolveUnlockReceived = () => resolve();
    });

    if (host.unlockReceived[callingWorkflowId])
      console.warn("multiple locks from same workflow");

    host.unlockReceived[callingWorkflowId] = () => {
      console.log("unlock received!", callingWorkflowId);

      // Let Typescript know that resolveUnlockReceived is not null here
      if (! resolveUnlockReceived) throw new Error("not reached");

      resolveUnlockReceived();
    };

    const handle = client.workflow.getHandle(callingWorkflowId);
    console.log("sending lockGranted signal...");
    await handle.signal(lockGranted, { hostname: host.hostname });
    console.log("...lockGranted signal sent");

    let intervalId;
    try {
      intervalId = setInterval(
        () => {
          console.log('lock process heartbeat');
          heartbeat();
        },
        1000);
      await unlockReceivedPromise;
    }
    finally {
      clearInterval(intervalId);
    }

    console.log("end lock_process on", host.hostname);
  },

});

export const createHostSpecificActivities = (host: HeavyHost) => ({

  async unlock(): Promise<void> {
    const callingWorkflowId = Context.current().info.workflowExecution.workflowId;

    console.log("unlock", host.hostname, "called from workflow", callingWorkflowId);

    const unlockReceivedCallback: (() => void) | undefined =
      host.unlockReceived[callingWorkflowId];

    if (unlockReceivedCallback) {
      unlockReceivedCallback();
      delete host.unlockReceived[callingWorkflowId];
    }
    else {
      throw new Error("unlock called without lock");
    }
  },

  async heavyWork(): Promise<void> {
    // do some heavy work

    // In production we should heartbeat so that workflow gets
    // notified if we crash.

    await sleep(10 * 1000);
  },

});
