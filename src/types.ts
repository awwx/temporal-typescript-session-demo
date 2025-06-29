import { defineSignal } from '@temporalio/workflow';

export type UnlockReceived = { [workflow_id: string]: () => void };

export interface HeavyHost {
  hostname: string;
  unlockReceived: UnlockReceived;
}

export interface LockGrantedInput {
  hostname: string;
}

export const lockGranted = defineSignal<[LockGrantedInput]>('lockGranted');
