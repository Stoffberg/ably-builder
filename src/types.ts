import { Types } from 'ably';
import Ably from 'ably/promises';
import { z } from 'zod';

export type DRSchema = Record<string, Record<string, z.ZodTypeAny>>;
export type SRSchema = Record<string, z.ZodTypeAny>;
export type Schema = z.ZodTypeAny;

export type CreateRouter = <C, T extends DRSchema>(router: Router<C, T>, context: C & BaseClientContext) => Promise<ConfiguredRouter<C, T>>;

export type ConfiguredRouter<C, T extends DRSchema> = {
  context: C & BaseClientContext;
  client: ExtendedClient;
  subscribe: <K extends keyof T, P extends keyof Channel<C, T[K]>['messages'], H extends z.infer<Message<C, T[K][P]>['data']>>(
    channel: K,
    message: P | 'global',
    callback: (data: H) => void,
  ) => Promise<void>;
} & { [K in keyof T]: ConfiguredChannel<C, T[K]> };

export type ExtendedClient = Types.RealtimePromise & {
  close: () => Promise<void>;
};

export type Router<C, T extends DRSchema> = {
  channels: { [K in keyof T]: Channel<C, T[K]> };
};

export type ConfiguredChannel<C, T extends SRSchema> = {
  subscribe: (<K extends keyof T, H extends z.infer<Message<C, T[K]>['data']>>(message: K | 'global', callback: (data: H) => void) => Promise<void>) &
    (<K extends keyof T, H extends z.infer<Message<C, T[K]>['data']>>(
      channelName: string,
      message: K | 'global',
      callback: (data: H) => void,
    ) => Promise<void>);
} & { [K in keyof T]: ConfiguredMessage<T[K]> };

export type ConfiguredMessage<T extends Schema> = {
  subscribe: ((callback: (data: z.infer<T>) => void) => Promise<void>) & ((messageName: string, callback: (data: z.infer<T>) => void) => Promise<void>);
  send: ((data: z.infer<T>) => void) &
    ((channelName: string, data: z.infer<T>) => void) &
    ((channelName: string, messageName: string, data: z.infer<T>) => void);
};

export type Channel<C, T extends SRSchema> = {
  messages: { [K in keyof T]: Message<C, T[K]> };
};

export type Message<C, T extends Schema> = {
  data: T;
  handler: (context: C & ChannelHandlerContext<T>, data: z.infer<T>) => void;
  transform?: (context: BaseClientContext, data: z.infer<T>) => z.infer<T>;
};

export type ChannelHandlerContext<T extends Schema> = {
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
