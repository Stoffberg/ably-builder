/* eslint-disable @typescript-eslint/no-explicit-any */
import Ably from 'ably/promises';
import * as Types from './types';

export const createContext = <T>(context: T & Types.BaseClientContext) => context;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createChannel = <C, T extends Record<string, Types.Schema>>(channel: Types.Channel<C, T>, context?: C) =>
  channel;

// Client State is managed here
let client: Ably.Realtime | null = null;
const configureClient = async (key: string, clientId: string) =>
  new Promise<Types.AblyClient>((resolve) => {
    if (!['closed', 'closing'].includes(client?.connection.state || '') && client) client.close();

    client = new Ably.Realtime({ key, clientId });
    client.connection.on('connected', () => {
      //console.log('Connected to Ably');
      if (!client) throw new Error('Client connected, but is not defined');
      resolve(client);
    });

    client.connection.on('failed', (e) => {
      console.log('Failed to connect to Ably');
      throw new Error("The client couldn't be initialized: \n" + e);
    });
  });

// The core of the whole library is in this function
export const createRouter = async <C, T extends Record<string, Record<string, Types.Schema>>>(
  router: Types.Router<C, T>,
): Promise<Types.ConfiguredRouter<C, T>> => {
  const client = await configureClient(router.context.key, router.context.clientId);
  const channels = {} as Record<string, Types.AblyChannel>;

  // The base subscribe function
  const baseSubscribe = async (channel: string, message: string, callback: (data: any) => void) => {
    const instance = channels[channel];
    const messageUtils = router.channels[channel].messages[message];
    const parsedCallback = (data: any) => {
      const parsedData = messageUtils.data.parse(data.data);
      if (messageUtils.transform) {
        const transformedData = messageUtils.transform(router.context, parsedData);
        callback(transformedData);
      } else {
        callback(parsedData);
      }
    };
    await instance.subscribe(message, parsedCallback);
  };

  type ChannelsType = Types.Channel<C, T[keyof T]>;
  type MessageTypes = Types.Message<C, T[keyof T][keyof (keyof T)]>;
  // Configure the channels
  const configuredChannels = Object.entries<ChannelsType>(router.channels as any).reduce(
    (acc, [channelName, channel]) => {
      channels[channelName] = client.channels.get(channelName);
      const instance = channels[channelName];

      // Channel level subscription
      const channelSubscribe = async (message: string, callback: (data: any) => void) => {
        await baseSubscribe(channelName, message, callback);
      };

      const newChannel = {} as Types.ConfiguredChannel<C, T[keyof T]>;

      newChannel.subscribe = channelSubscribe as Types.ConfiguredChannel<C, Record<string, Types.Schema>>['subscribe'];

      newChannel.messages = Object.entries<MessageTypes>(channel.messages as any).reduce(
        (acc, [messageName, message]) => {
          const messageSubscribe = async (callback: (data: any) => void) => {
            await baseSubscribe(channelName, messageName, callback);
          };

          acc[messageName as keyof ChannelsType['messages']] = {
            subscribe: messageSubscribe as Types.ConfiguredMessage<Types.Schema>['subscribe'],
            send: (data: any) => {
              const publish = (data: any) => instance.publish(messageName, data);
              message.handler({ channel: instance, client, publish, ...router.context }, data);
            },
          };

          return acc;
        },
        {} as Types.ConfiguredChannel<C, T[keyof T]>['messages'],
      );

      acc[channelName as keyof T] = newChannel;

      return acc;
    },
    {} as Types.ConfiguredRouter<C, T>['channels'],
  );

  // Return the configured Router
  const configuredRouter = {
    subscribe: baseSubscribe as Types.ConfiguredRouter<C, T>['subscribe'],
    channels: configuredChannels as { [K in keyof T]: Types.ConfiguredChannel<C, T[K]> },
    context: { ...router.context, client },
  };

  return configuredRouter;
};
