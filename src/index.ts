/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Ably from 'ably/promises';
import * as t from './types';

export type CreateChannel = <C, T extends t.SRSchema>(channel: t.Channel<C, T>) => t.Channel<C, T>;

export const createContext = <C>(context: C & t.BaseClientContext) => ({
  ...context,
  createChannel: <T extends t.SRSchema>(channel: t.Channel<C, T>) => channel,
  createRouter: <T extends t.DRSchema>(router: t.Router<C, T>) => createRouter(router, context),
});

// Client State is managed here
let _client = null as Ably.Realtime | null;
const closeClient = async () => {
  if (!_client) return;

  if (['initialized', 'connected'].includes(_client?.connection.state || '') && _client) _client.close();

  const timeout = setTimeout(() => {
    throw new Error('Client did not close');
  }, 5000);

  // resolve when client is closed
  await _client.connection.whenState('closed');

  return clearTimeout(timeout);
};

const configureClient = async (key: string, clientId: string) =>
  new Promise<t.ExtendedClient>((resolve) => {
    const callback = async () => {
      await closeClient();

      _client = new Ably.Realtime({ key, clientId });
      _client.connection.on('connected', () => {
        //console.log('Connected to Ably');
        if (!_client) throw new Error('Client connected, but is not defined');
        resolve({ ..._client, close: closeClient });
      });

      _client.connection.on('failed', (e) => {
        console.log('Failed to connect to Ably');
        throw new Error("The client couldn't be initialized: \n" + e);
      });
    };

    callback();
  });

// The core of the whole library is in this function
export const createRouter = async <C, T extends t.DRSchema>(router: t.Router<C, T>, context: C & t.BaseClientContext): Promise<t.ConfiguredRouter<C, T>> => {
  const client = await configureClient(context.key, context.clientId);
  const _channels = new Map<string, t.AblyChannel>();

  const configureChannel = (channel: string) => {
    if (!_client) throw new Error('Client is not defined');

    if (!_channels.has(channel)) _channels.set(channel, _client.channels.get(channel));

    return _channels.get(channel) as t.AblyChannel;
  };

  type MessageUtils = { schema: t.Schema; transform?: (context: any, data: any) => any };
  type SubscriptionData = { channel: string; message?: string; callback: (data: any) => void; utils?: MessageUtils };
  const _subscribe = async ({ channel, message, callback, utils }: SubscriptionData) => {
    const instance = configureChannel(channel);

    const adjustData = (data: any) => {
      if (!utils) return data;
      const { schema, transform } = utils;
      const result = schema.safeParse(data);
      if (!result.success) throw new Error('Invalid data received');

      return transform ? transform(context, result.data) : result.data;
    };

    const adjustedCallback = (data: any) => callback(adjustData(data.data));

    if (!message) await instance.subscribe(adjustedCallback);
    else await instance.subscribe(message, adjustedCallback);
  };

  const configuredRouter = { context, client, channels: {} } as t.ConfiguredRouter<C, t.DRSchema>;

  const channelMap = new Map<string, t.Channel<C, any>>(Object.entries(router.channels));
  const channelIterator = channelMap.entries();
  for (let i = 0; i < channelMap.size; i++) {
    const [oldChannelName, channel] = channelIterator.next().value as [string, t.Channel<C, any>];

    const _configureChannel = (channelOptions?: t.ConfiguredChannelOptions) => {
      const channelName = channelOptions?.name || oldChannelName;
      const instance = configureChannel(channelName);

      const _channelSubscribe = (callback: (data: any) => void) => _subscribe({ channel: channelName, callback });

      const configuredMessages = {} as Record<string, (messageOptions?: t.ConfiguredMessageOptions) => t.ConfiguredMessage<t.Schema>>;

      const messageMap = new Map<string, t.Message<any, any>>(Object.entries(channel.messages));
      const messageIterator = messageMap.entries();
      for (let j = 0; j < messageMap.size; j++) {
        const [baseMessageName, message] = messageIterator.next().value as [string, t.Message<C, any>];

        const _configureMessage = (messageOptions?: t.ConfiguredMessageOptions) => {
          const messageName = messageOptions?.name || baseMessageName;

          const _messageSubscribe = async (callback: (data: any) => void) => {
            const utils = { schema: message.data, transform: message.transform };
            await _subscribe({ channel: channelName, message: messageName, callback, utils });
          };

          const _messageSend = async (data: any) => {
            const publish = async (data: any) => await instance.publish(messageName, data);
            await message.handler({ channel: instance, client, publish, ...context }, data);
          };

          return { subscribe: _messageSubscribe, send: _messageSend };
        };

        configuredMessages[baseMessageName] = _configureMessage;
      }

      return { messages: configuredMessages, subscribe: _channelSubscribe };
    };

    configuredRouter.channels[oldChannelName] = _configureChannel;
  }

  return configuredRouter as unknown as t.ConfiguredRouter<C, T>;
};
