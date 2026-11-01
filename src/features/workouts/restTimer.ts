import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

interface NativeTimerState {
  active: boolean;
  timerId?: string;
  exerciseName?: string;
  remainingSeconds?: number;
}

interface RestTimerTick {
  timerId: string;
  exerciseName: string;
  remainingSeconds: number;
}

interface RestTimerFinished {
  timerId: string;
  exerciseName: string;
}

interface RestTimerNativeModule {
  startTimer(
    timerId: string,
    exerciseName: string,
    durationSeconds: number,
  ): Promise<void>;
  cancelTimer(): Promise<void>;
  getTimerState(): Promise<NativeTimerState>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const nativeTimer = NativeModules.RestTimer as
  | RestTimerNativeModule
  | undefined;
const timerEvents = nativeTimer ? new NativeEventEmitter(nativeTimer) : null;

function requireNativeTimer(): RestTimerNativeModule {
  if (!nativeTimer) {
    throw new Error('Android 組間休息計時器尚未載入');
  }
  return nativeTimer;
}

export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function restDurationSeconds(minutes: string, seconds: string): number {
  const mins = Math.min(Number.parseInt(minutes || '0', 10) || 0, 99);
  const secs = Math.min(Number.parseInt(seconds || '0', 10) || 0, 59);
  return mins * 60 + secs;
}

export function splitRestDuration(totalSeconds?: number): {
  minutes: string;
  seconds: string;
} {
  const total = Math.max(0, Math.floor(totalSeconds ?? 0));
  return {
    minutes: total ? String(Math.floor(total / 60)) : '',
    seconds: total ? String(total % 60) : '',
  };
}

export function formatRestDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}`;
}

export async function requestRestTimerNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await PermissionsAndroid.check(permission)) {
    return true;
  }
  return (await PermissionsAndroid.request(permission)) === 'granted';
}

export async function startRestTimer(
  timerId: string,
  exerciseName: string,
  durationSeconds: number,
): Promise<void> {
  await requireNativeTimer().startTimer(
    timerId,
    exerciseName,
    durationSeconds,
  );
}

export async function cancelRestTimer(): Promise<void> {
  await requireNativeTimer().cancelTimer();
}

export async function getRestTimerState(): Promise<NativeTimerState> {
  return requireNativeTimer().getTimerState();
}

export function addRestTimerTickListener(
  listener: (event: RestTimerTick) => void,
) {
  return timerEvents?.addListener('RestTimerTick', listener);
}

export function addRestTimerFinishedListener(
  listener: (event: RestTimerFinished) => void,
) {
  return timerEvents?.addListener('RestTimerFinished', listener);
}
