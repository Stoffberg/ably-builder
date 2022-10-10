import { describe, expect, test } from '@jest/globals';

import { createContext } from '../src/index';
import { z } from 'zod';

jest.setTimeout(6000);

describe('Sunshine', () => {
  test('PubSub: Send String', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { id: { name: 'kjsngd' } },
        clientId: performance.now().toString(),
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
      await router.channels
        .testChannel()
        .messages.reation()
        .subscribe(async (data) => {
          expect(data.emoji).toBe('🧪');

          await router.client.close();

          done();
        });

      router.channels.testChannel().messages.reation().send({ emoji: '🧪' });
    };

    callback();
  });

  test('PubSub: Send Context', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: performance.now().toString(),
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
      await router.channels
        .testChannel()
        .messages.context()
        .subscribe(async (data) => {
          expect(data.user.name.string).toBe('Dirk S Beukes');

          await router.client.close();

          done();
        });

      router.channels
        .testChannel()
        .messages.context()
        .send({ user: { name: { string: 'Invalid Type' } } });
    };

    callback();
  });

  test('PubSub: Channel Level Sub', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: performance.now().toString(),
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
      await router.channels.testChannel().subscribe(async (data) => {
        expect(data.data).toBe('Hello World');

        await router.client.close();

        done();
      });

      router.channels.testChannel().messages.message().send({ data: 'Hello World' });
    };

    callback();
  });

  test('PubSub: Message Level Sub', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: performance.now().toString(),
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
      await router.channels
        .testChannel()
        .messages.message()
        .subscribe(async (data) => {
          expect(data.data).toBe('Hello World');

          await router.client.close();

          done();
        });

      router.channels.testChannel().messages.message().send({ data: 'Hello World' });
    };

    callback();
  });
});

describe('Dynamic', () => {
  test('PubSub: Channel', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: performance.now().toString(),
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
      await router.channels.testChannel({ name: 'dynamic' }).subscribe(async (data) => {
        expect(data.data).toBe('🧪');

        await router.client.close();

        done();
      });

      router.channels.testChannel({ name: 'dynamic' }).messages.message().send({ data: '🧪' });
    };

    callback();
  });

  test('PubSub: Message', (done) => {
    const callback = async () => {
      const context = createContext({
        user: { name: { string: 'Dirk S Beukes' } },
        clientId: performance.now().toString(),
        key: 'zrtcEQ.N8Z_cA:zPgtz_wFo3os-Se5RIZIh6oyBCkHhhBvuad07F33DdY',
      });

      const testChannel = context.createChannel({
        messages: {
          message: {
            data: z.object({ data: z.string() }),
            handler: async (context, content) => {
              expect(content.data).toBe('🧪');
              await context.publish({ data: content.data });
            },
          },
        },
      });

      const router = await context.createRouter({ channels: { testChannel } });

      expect(router).toBeDefined();
      await router.channels
        .testChannel()
        .messages.message({ name: 'dynamic' })
        .subscribe(async (data) => {
          expect(data.data).toBe('🧪');

          await router.client.close();

          done();
        });

      await router.channels.testChannel().messages.message({ name: 'dynamic' }).send({ data: '🧪' });
    };

    callback();
  });
});

// router.channels.testChannel('dynamic').message.textMessage().send({ data: '🧪' });
