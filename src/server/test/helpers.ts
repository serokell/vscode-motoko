import { EventEmitter } from 'node:events';

export const wait = (s: number) =>
    new Promise((resolve) => setTimeout(resolve, s * 1000));

export function waitForNotification<T>(
    name: string,
    emitter: EventEmitter,
): Promise<T> {
    return new Promise<T>((resolve) => {
        emitter.once(name, (message: T) => {
            resolve(message);
        });
    });
}
