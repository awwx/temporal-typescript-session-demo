import { condition, log, proxyActivities, setHandler, sleep, ActivityCancellationType } from '@temporalio/workflow';

import type {
  createProcessLockActivities,
  createHostSpecificActivities,
} from "./heavy_activities";

import { lockGranted, LockGrantedInput } from "./types";

const { lock_process } =
  proxyActivities<
    ReturnType<typeof createProcessLockActivities>
  >({
    taskQueue: 'process-lock',
    heartbeatTimeout: '3s',
    startToCloseTimeout: '1 year',
    retry: {
      // If the heartbeat fails that means the heavy worker crashed,
      // we don't want to retry because we want the workflow
      // to be notified so that it can recover by for example
      // rerunning heavy tasks on a different heavy host.
      maximumAttempts: 1,
    },
  });

export async function use_heavy(): Promise<void> {
  let lockGrantedHostname: string | null = null;

  setHandler(lockGranted, async function lockGranted(input: LockGrantedInput) {
    log.info("lockGranted signal received from host " + input.hostname);
    lockGrantedHostname = input.hostname;
  });

  // Wait for an available heavy worker.

  const lockProcessComplete = lock_process();

  lockProcessComplete.catch((e) => {
    // Lock failed, maybe because the heavy process crashed!
    // Maybe do something useful like retry on a different host?
    log.error(e);
  });

  await condition(() => lockGrantedHostname !== null);
  log.info("lock granted!");

  // let Typescript know lockGrantedHost is now not null
  if (! lockGrantedHostname) throw new Error("not reached");

  // Run the host specific activities on the task queue named
  // after the host.

  const hostSpecificActivities =
    proxyActivities<
      ReturnType<typeof createHostSpecificActivities>
    >({
       taskQueue: lockGrantedHostname,
       startToCloseTimeout: '1 hour',
    });

  await hostSpecificActivities.heavyWork();

  log.info("unlocking...");

  await hostSpecificActivities.unlock();

  log.info("Unlocked, all done.  Goodbye.");
}
