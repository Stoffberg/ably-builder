import { Types } from 'ably';
import Ably from 'ably/promises';
import { z } from 'zod';

export type CreateRouter = <C, T extends Record<string, Record<string, z.ZodTypeAny>>>(
  router: Router<C, T>,
) => Promise<ConfiguredRouter<C, T>>;

export type ConfiguredRouter<C, T extends Record<string, Record<string, z.ZodTypeAny>>> = {
  context: C & BaseClientContext & { client: Types.RealtimePromise };
  channels: { [K in keyof T]: ConfiguredChannel<T[K]> };
  subscribe: <
    K extends keyof T,
    P extends keyof Channel<T[K]>['messages'],
    H extends z.infer<Message<T[K][P]>['data']>,
  >(
    channel: K,
    message: P,
    callback: (data: H) => void,
  ) => Promise<void>;
};

export type Router<C, T extends Record<string, Record<string, z.ZodTypeAny>>> = {
  context: C & BaseClientContext;
  channels: { [K in keyof T]: Channel<T[K]> };
};

export type ConfiguredChannel<T extends Record<string, z.ZodTypeAny>> = {
  [K in keyof T]: (data: z.infer<T[K]>) => void;
};

export type Channel<T extends Record<string, z.ZodTypeAny>> = {
  messages: { [K in keyof T]: Message<T[K]> };
};

export type Message<T extends z.ZodTypeAny> = {
  data: T;
  handler: (context: ChannelHandlerContext<T>, data: z.infer<T>) => void;
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
