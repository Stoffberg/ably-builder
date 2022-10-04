import { Types } from 'ably';
import Ably from 'ably/promises';
import { z } from 'zod';

export type CreateRouter = <C, T extends Record<string, Record<string, z.ZodTypeAny>>>(
  router: Router<C, T>,
) => Promise<ConfiguredRouter<C, T>>;

export type ConfiguredRouter<C, T extends Record<string, Record<string, z.ZodTypeAny>>> = {
  context: C & BaseClientContext & { client: Types.RealtimePromise };
  channels: { [K in keyof T]: ConfiguredChannel<C, T[K]> };
  subscribe: <
    K extends keyof T,
    P extends keyof Channel<C, T[K]>['messages'],
    H extends z.infer<Message<C, T[K][P]>['data']>,
  >(
    channel: K,
    message: P,
    callback: (data: H) => void,
  ) => Promise<void>;
};

export type Router<C, T extends Record<string, Record<string, z.ZodTypeAny>>> = {
  context: C & BaseClientContext;
  channels: { [K in keyof T]: Channel<C, T[K]> };
};

export type ConfiguredChannel<C, T extends Record<string, z.ZodTypeAny>> = {
  subscribe: <K extends keyof T, H extends z.infer<Message<C, T[K]>['data']>>(
    message: K,
    callback: (data: H) => void,
  ) => Promise<void>;
  messages: { [K in keyof T]: ConfiguredMessage<T[K]> };
};

export type ConfiguredMessage<T extends z.ZodTypeAny> = {
  subscribe: (callback: (data: z.infer<T>) => void) => Promise<void>;
  send: (data: z.infer<T>) => void;
};

export type Channel<C, T extends Record<string, z.ZodTypeAny>> = {
  messages: { [K in keyof T]: Message<C, T[K]> };
};

export type Message<C, T extends z.ZodTypeAny> = {
  data: T;
  handler: (context: C & ChannelHandlerContext<T>, data: z.infer<T>) => void;
  transform?: (context: BaseClientContext, data: z.infer<T>) => z.infer<T>;
};

export type ChannelHandlerContext<T extends z.ZodTypeAny> = {
  channel: Types.RealtimeChannelPromise;
  client: Types.RealtimePromise;
  publish: (data: z.infer<T>) => void;
} & BaseClientContext;

export type BaseClientContext = {
  key: string;
  clientId: string;
};

export type AblyChannel = Types.RealtimeChannelPromise;
export type AblyClient = Ably.Realtime;

export type Schema = z.ZodTypeAny;
