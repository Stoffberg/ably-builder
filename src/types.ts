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
  channels: { [K in keyof T]: (channelOptions?: ConfiguredChannelOptions) => ConfiguredChannel<C, T[K]> };
};

export type ConfiguredChannelOptions = {
  name?: string;
};

export type ExtendedClient = Omit<Types.RealtimePromise, 'close'> & {
  close: () => Promise<void>;
};

export type Router<C, T extends DRSchema> = {
  channels: { [K in keyof T]: Channel<C, T[K]> };
};

export type ConfiguredChannel<C, T extends SRSchema> = {
  subscribe: <K extends keyof T, H extends z.infer<Message<C, T[K]>['data']>>(callback: (data: H) => void) => Promise<void>;
  messages: { [K in keyof T]: (messageOptions?: ConfiguredMessageOptions) => ConfiguredMessage<T[K]> };
};

export type ConfiguredMessageOptions = {
  name?: string;
};

export type ConfiguredMessage<T extends Schema> = {
  subscribe: (callback: (data: z.infer<T>) => void) => Promise<void>;
  send: (data: z.infer<T>) => Promise<void>;
};

export type Channel<C, T extends SRSchema> = {
  messages: { [K in keyof T]: Message<C, T[K]> };
};

export type Message<C, T extends Schema> = {
  data: T;
  handler: (context: C & ChannelHandlerContext<T>, data: z.infer<T>) => Promise<void> | void;
  transform?: (context: BaseClientContext, data: z.infer<T>) => z.infer<T>;
};

export type ChannelHandlerContext<T extends Schema> = {
  channel: Types.RealtimeChannelPromise;
  client: Types.RealtimePromise;
  publish: (data: z.infer<T>) => Promise<void>;
} & BaseClientContext;

export type BaseClientContext = {
  key: string;
  clientId: string;
};

export type AblyChannel = Types.RealtimeChannelPromise;
export type AblyClient = Ably.Realtime;
