import { describe, expect, test } from '@jest/globals';

import { createChannel, createRouter, createContext } from '../src/index';
import { z } from 'zod';

jest.setTimeout(10000);

describe('Sunshine', () => {
  test('PubSub: Send String', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { id: { name: 'kjsngd' } },
        clientId: '123',
        key: 'zrtcEQ.N8Z_cA:zPgtz_wFo3os-Se5RIZIh6oyBCkHhhBvuad07F33DdY',
      });

      const testChannel = createChannel({
        messages: {
          textMessage: {
            data: z.object({ content: z.string() }),
            handler: (context, { content }) => {
              expect(content).toBe('Hello from the oher side!');
              context.publish({ content });
            },
          },
          reation: {
            data: z.object({ emoji: z.string() }),
            handler: (context, { emoji }) => {
              expect(emoji).toBe('🧪');
              context.publish({ emoji });
            },
          },
        },
      });

      const router = await createRouter({ context, channels: { testChannel } });

      expect(router).toBeDefined();
      await router.subscribe('testChannel', 'reation', (data) => {
        expect(data.emoji).toBe('🧪');

        if (!['closed', 'closing'].includes(router.context.client?.connection.state || '') && router.context.client)
          router.context.client.close();

        done();
      });

      router.channels.testChannel.messages.reation.send({ emoji: '🧪' });
    };

    callback();
  });

  test('PubSub: Send Context', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: '123',
        key: 'zrtcEQ.N8Z_cA:zPgtz_wFo3os-Se5RIZIh6oyBCkHhhBvuad07F33DdY',
      });

      const testChannel = createChannel(
        {
          messages: {
            context: {
              data: z.object({ user: z.object({ name: z.object({ string: z.string() }) }) }),
              handler: (context, content) => {
                expect(content.user.name.string).toBe('Invalid Type');
                const { user } = context;
                context.publish({ user });
              },
            },
          },
        },
        context,
      );

      const router = await createRouter({ context, channels: { testChannel } });

      expect(router).toBeDefined();
      await router.subscribe('testChannel', 'context', (data) => {
        expect(data.user.name.string).toBe('Dirk S Beukes');

        if (!['closed', 'closing'].includes(router.context.client?.connection.state || '') && router.context.client)
          router.context.client.close();

        done();
      });

      router.channels.testChannel.messages.context.send({ user: { name: { string: 'Invalid Type' } } });
    };

    callback();
  });

  test('PubSub: Channel Level Sub', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: '123',
        key: 'zrtcEQ.N8Z_cA:zPgtz_wFo3os-Se5RIZIh6oyBCkHhhBvuad07F33DdY',
      });

      const testChannel = createChannel(
        {
          messages: {
            message: {
              data: z.object({ data: z.string() }),
              handler: (context, content) => {
                expect(content.data).toBe('Hello World');
                context.publish({ data: content.data });
              },
            },
          },
        },
        context,
      );

      const router = await createRouter({ context, channels: { testChannel } });

      expect(router).toBeDefined();
      await router.channels.testChannel.subscribe('message', (data) => {
        expect(data.data).toBe('Hello World');

        if (!['closed', 'closing'].includes(router.context.client?.connection.state || '') && router.context.client)
          router.context.client.close();

        done();
      });

      router.channels.testChannel.messages.message.send({ data: 'Hello World' });
    };

    callback();
  });

  test('PubSub: Message Level Sub', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: '123',
        key: 'zrtcEQ.N8Z_cA:zPgtz_wFo3os-Se5RIZIh6oyBCkHhhBvuad07F33DdY',
      });

      const testChannel = createChannel(
        {
          messages: {
            message: {
              data: z.object({ data: z.string() }),
              handler: (context, content) => {
                expect(content.data).toBe('Hello World');
                context.publish({ data: content.data });
              },
            },
          },
        },
        context,
      );

      const router = await createRouter({ context, channels: { testChannel } });

      expect(router).toBeDefined();
      await router.channels.testChannel.messages.message.subscribe((data) => {
        expect(data.data).toBe('Hello World');

        if (!['closed', 'closing'].includes(router.context.client?.connection.state || '') && router.context.client)
          router.context.client.close();

        done();
      });

      router.channels.testChannel.messages.message.send({ data: 'Hello World' });
    };

    callback();
  });
});
