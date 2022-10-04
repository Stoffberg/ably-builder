/* eslint-disable @typescript-eslint/no-explicit-any */
import Ably from 'ably/promises';
import * as Types from './types';

export const createContext = <T>(context: T & Types.BaseClientContext) => context;
export const createChannel = <T extends Record<string, Types.Schema>>(channel: Types.Channel<T>) => channel;

// Client State is managed here
let client: Ably.Realtime | null = null;
const configureClient = async (key: string, clientId: string) =>
  new Promise<Types.AblyClient>((resolve) => {
    if (client) client.close();

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
export const createRouter: Types.CreateRouter = async (router) => {
  const client = await configureClient(router.context.key, router.context.clientId);
  const channels = {} as Record<string, Types.AblyChannel>;

  // The channel subscribe function
  const channelSubscribe = async (channel: string, message: string, callback: (data: any) => void) => {
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

  // Configure the channels
  const configuredChannels = Object.entries(router.channels).reduce((acc, [channelName, channel]) => {
    channels[channelName] = client.channels.get(channelName);
    const instance = channels[channelName];

    acc[channelName] = Object.entries<any>(channel.messages).reduce((acc, [messageName, message]) => {
      acc[messageName] = (data: any) => {
        const publish = () => instance.publish(messageName, data);
        message.handler({ channel: instance, client, publish, ...router.context }, data);
      };

      return acc;
    }, {} as Record<string, any>);
    return acc;
  }, {} as Record<string, any>);

  // Return the configured Router
  const configuredRouter = {
    subscribe: channelSubscribe,
    channels: configuredChannels,
    context: { ...router.context, client },
  } as any; // TODO: Made the type infer correctly

  return configuredRouter;
};
