import { describe, expect, test } from '@jest/globals';

import { createChannel, createRouter, createContext } from '../src/index';
import { z } from 'zod';

jest.setTimeout(10000);

let router;

describe('Sunshine', () => {
  beforeAll(async () => {
    const context = createContext({
      user: { id: { name: 'kjsngd' } },
      clientId: '123',
      key: 'zrtcEQ.N8Z_cA:zPgtz_wFo3os-Se5RIZIh6oyBCkHhhBvuad07F33DdY',
    });

    const testChannel = createChannel({
      messages: {
        send: {
          data: z.object({ content: z.string() }),
          handler: (context, { content }) => {
            expect(content).toBe('Hello from the oher side!');
            context.publish({ content });
          },
        },
        react: {
          data: z.object({ emoji: z.string() }),
          handler: (context, { emoji }) => {
            expect(emoji).toBe('🧪');
            context.publish({ emoji });
          },
        },
      },
    });

    router = await createRouter({ context, channels: { testChannel } });

    expect(router).toBeDefined();
  });

  test('PubSub: emoji', (done) => {
    const callback = async () => {
      await router.subscribe('testChannel', 'react', (data) => {
        expect(data.emoji).toBe('🧪');

        done();
      });

      router.channels.testChannel.react({ emoji: '🧪' });
    };

    callback();
  });

  test('PubSub: string', (done) => {
    const callback = async () => {
      await router.subscribe('testChannel', 'send', (data) => {
        expect(data.content).toBe('Hello from the oher side!');

        done();
      });

      router.channels.testChannel.send({ content: 'Hello from the oher side!' });
    };

    callback();
  });
});
