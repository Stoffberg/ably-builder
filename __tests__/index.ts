import { describe, expect, test } from '@jest/globals';

import { createContext } from '../src/index';
import { z } from 'zod';

jest.setTimeout(6000);

describe('Sunshine', () => {
  test('PubSub: Send String', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { id: { name: 'kjsngd' } },
        clientId: '123',
        key: 'zrtcEQ.N8Z_cA:zPgtz_wFo3os-Se5RIZIh6oyBCkHhhBvuad07F33DdY',
      });

      const testChannel = context.createChannel({
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

      const router = await context.createRouter({ channels: { testChannel } });

      expect(router).toBeDefined();
      await router.subscribe('testChannel', 'reation', (data) => {
        expect(data.emoji).toBe('🧪');

        router.client.close();

        done();
      });

      router.testChannel.reation.send({ emoji: '🧪' });
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

      const testChannel = context.createChannel({
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
      });

      const router = await context.createRouter({ channels: { testChannel } });

      expect(router).toBeDefined();
      await router.subscribe('testChannel', 'context', (data) => {
        expect(data.user.name.string).toBe('Dirk S Beukes');

        router.client.close();

        done();
      });

      router.testChannel.context.send({ user: { name: { string: 'Invalid Type' } } });
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

      const testChannel = context.createChannel({
        messages: {
          message: {
            data: z.object({ data: z.string() }),
            handler: (context, content) => {
              expect(content.data).toBe('Hello World');
              context.publish({ data: content.data });
            },
          },
        },
      });

      const router = await context.createRouter({ channels: { testChannel } });

      expect(router).toBeDefined();
      await router.testChannel.subscribe('message', (data) => {
        expect(data.data).toBe('Hello World');

        router.client.close();

        done();
      });

      router.testChannel.message.send({ data: 'Hello World' });
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

      const testChannel = context.createChannel({
        messages: {
          message: {
            data: z.object({ data: z.string() }),
            handler: (context, content) => {
              expect(content.data).toBe('Hello World');
              context.publish({ data: content.data });
            },
          },
        },
      });

      const router = await context.createRouter({ channels: { testChannel } });

      expect(router).toBeDefined();
      await router.testChannel.message.subscribe((data) => {
        expect(data.data).toBe('Hello World');

        router.client.close();

        done();
      });

      router.testChannel.message.send({ data: 'Hello World' });
    };

    callback();
  });

  test('PubSub: Global Message Sub', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: '123',
        key: 'zrtcEQ.N8Z_cA:zPgtz_wFo3os-Se5RIZIh6oyBCkHhhBvuad07F33DdY',
      });

      const testChannel = context.createChannel({
        messages: {
          message: {
            data: z.object({ data: z.string() }),
            handler: (context, content) => {
              expect(content.data).toBe('🧪');
              context.publish({ data: content.data });
            },
          },
        },
      });

      const router = await context.createRouter({ channels: { testChannel } });

      expect(router).toBeDefined();
      await router.testChannel.subscribe('global', (data) => {
        expect(data.data).toBe('🧪');

        router.client.close();

        done();
      });

      router.testChannel.message.send({ data: '🧪' });
    };

    callback();
  });

  test('PubSub: Dynamic Channel', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: '123',
        key: 'zrtcEQ.N8Z_cA:zPgtz_wFo3os-Se5RIZIh6oyBCkHhhBvuad07F33DdY',
      });

      const testChannel = context.createChannel({
        messages: {
          message: {
            data: z.object({ data: z.string() }),
            handler: (context, content) => {
              expect(content.data).toBe('🧪');
              context.publish({ data: content.data });
            },
          },
        },
      });

      const router = await context.createRouter({ channels: { testChannel } });

      expect(router).toBeDefined();
      await router.testChannel.subscribe('dynamic', 'global', (data) => {
        expect(data.data).toBe('🧪');

        router.client.close();

        done();
      });

      router.testChannel.message.send('dynamic', { data: '🧪' });
    };

    callback();
  });
});
