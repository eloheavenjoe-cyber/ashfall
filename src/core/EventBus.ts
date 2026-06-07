import type { GameEvent } from './GameEvent';
import { Logger } from './Logger';

const logger = Logger.forSystem('EVENT_BUS');

type EventHandler = (payload?: any) => void;

interface Subscriber {
  handler: EventHandler;
  context: object | null;
  once: boolean;
}

export class EventBus {
  private subscribers = new Map<string, Subscriber[]>();

  on(event: GameEvent, handler: EventHandler, context?: object): void {
    const subs = this.subscribers.get(event) || [];
    subs.push({ handler, context: context ?? null, once: false });
    this.subscribers.set(event, subs);
  }

  once(event: GameEvent, handler: EventHandler, context?: object): void {
    const subs = this.subscribers.get(event) || [];
    subs.push({ handler, context: context ?? null, once: true });
    this.subscribers.set(event, subs);
  }

  off(event: GameEvent, handler: EventHandler, context?: object): void {
    const subs = this.subscribers.get(event);
    if (!subs) return;
    this.subscribers.set(
      event,
      subs.filter((s) => {
        if (context !== undefined) {
          return s.handler !== handler || s.context !== context;
        }
        return s.handler !== handler;
      })
    );
  }

  emit(event: GameEvent, payload?: object): void {
    const subs = this.subscribers.get(event);
    if (!subs || subs.length === 0) {
      logger.warn('Event emitted with no subscribers', { event });
      return;
    }
    const remaining: Subscriber[] = [];
    for (const sub of subs) {
      try {
        sub.handler(payload);
      } catch (err) {
        logger.error('Subscriber threw exception', {
          event,
          error: String(err),
        });
      }
      if (!sub.once) {
        remaining.push(sub);
      }
    }
    this.subscribers.set(event, remaining);
  }

  offAll(context: object): void {
    for (const [event, subs] of this.subscribers.entries()) {
      const filtered = subs.filter((s) => s.context !== context);
      if (filtered.length === 0) {
        this.subscribers.delete(event);
      } else {
        this.subscribers.set(event, filtered);
      }
    }
  }

  subscriberCount(event: GameEvent): number {
    return this.subscribers.get(event)?.length ?? 0;
  }

  clear(): void {
    this.subscribers.clear();
  }
}
