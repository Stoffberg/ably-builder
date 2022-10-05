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
let client: Ably.Realtime | null = null;
const closeClient = async () => {
  if (!client) return;
  client?.connection.state;

  if (['initialized', 'connected'].includes(client?.connection.state || '') && client) client.close();

  const timeout = setTimeout(() => {
    throw new Error('Client did not close');
  }, 5000);

  // resolve when client is closed
  await client.connection.whenState('closed');

  return clearTimeout(timeout);
};

const configureClient = async (key: string, clientId: string) =>
  new Promise<t.ExtendedClient>((resolve) => {
    const callback = async () => {
      await closeClient();

      client = new Ably.Realtime({ key, clientId });
      client.connection.on('connected', () => {
        //console.log('Connected to Ably');
        if (!client) throw new Error('Client connected, but is not defined');
        resolve({ ...client, close: closeClient });
      });

      client.connection.on('failed', (e) => {
        console.log('Failed to connect to Ably');
        throw new Error("The client couldn't be initialized: \n" + e);
      });
    };

    callback();
  });

// The core of the whole library is in this function
export const createRouter = async <C, T extends t.DRSchema>(router: t.Router<C, T>, context: C & t.BaseClientContext): Promise<t.ConfiguredRouter<C, T>> => {
  const client = await configureClient(context.key, context.clientId);
  const channels = {} as Record<string, t.AblyChannel>;

  // The base subscribe function
  const baseSubscribe: t.ConfiguredRouter<any, t.DRSchema>['subscribe'] = async (channel: string, message: string, callback: (data: any) => void) => {
    if (!channels[channel]) channels[channel] = client.channels.get(channel);
    const instance = channels[channel];

    const messageUtils = router.channels[channel]?.messages[message];

    const parsedCallback = (data: any) => {
      const parsedData = messageUtils.data.parse(data.data);
      if (messageUtils.transform) {
        const transformedData = messageUtils.transform(context, parsedData);
        callback(transformedData);
      } else {
        callback(parsedData);
      }
    };

    const basicCallback = (data: any) => callback(data.data); // need to transform the data passed in the function

    if (message === 'global') await instance.subscribe(basicCallback);
    else await instance.subscribe(message, parsedCallback);
  };

  type ConfigChannelType = t.ConfiguredChannel<any, t.SRSchema>;
  type ConfigMessageType = t.ConfiguredMessage<t.Schema>;
  // Configure the channels
  const configuredChannels = Object.entries<t.Channel<any, t.SRSchema>>(router.channels as any).reduce((acc, [channelName, channel]) => {
    channels[channelName] = client.channels.get(channelName);
    const instance = channels[channelName];

    // Channel level subscription
    const channelSubscribe = async (_channelName: string, message: string | ((data: any) => void), callback?: (data: any) => void) => {
      if (typeof message === 'string') {
        if (!callback) throw new Error('Callback is not defined');
        return await baseSubscribe(_channelName, message, callback);
      } else {
        return await baseSubscribe(channelName, 'global', message);
      }
    };

    const newChannel = {} as t.ConfiguredChannel<any, t.SRSchema>;

    newChannel.subscribe = channelSubscribe as t.ConfiguredChannel<any, t.SRSchema>['subscribe'];

    const messages = Object.entries<t.Message<any, t.Schema>>(channel.messages as any).reduce((acc, [messageName, message]) => {
      const messageSubscribe = async (callback: (data: any) => void) => {
        await baseSubscribe(channelName, messageName, callback);
      };

      acc[messageName as keyof ConfigChannelType] = {
        subscribe: messageSubscribe as ConfigMessageType['subscribe'],
        send: (_channelName: any, _messageName: any, data: any) => {
          let _instance = channels[channelName];
          let publish = (data: any) => _instance.publish(messageName, data);

          const FS = typeof _channelName === 'string';
          const SS = typeof _messageName === 'string';

          if (FS) _instance = channels[_channelName];
          if (SS) publish = (data: any) => _instance.publish(_messageName, data);

          message.handler({ channel: _instance, client, publish, ...context }, FS ? (SS ? data : _messageName) : _channelName);
        },
      } as t.ConfiguredMessage<t.Schema>;

      return acc;
    }, {} as Record<string, t.ConfiguredMessage<t.Schema>>);

    acc[channelName] = { ...newChannel, ...messages } as ConfigChannelType;

    return acc;
  }, {} as t.ConfiguredRouter<any, t.DRSchema>);

  // Return the configured Router
  const configuredRouter = {
    ...configuredChannels,
    subscribe: baseSubscribe,
    context,
    client,
  } as unknown as t.ConfiguredRouter<C, T>;

  return configuredRouter;
};
