import { mockErrorHandler } from '@backstage/backend-test-utils';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { startTestEchoServer, TEST_PROTO } from './testFixtures/testGrpcServer';

describe('createRouter', () => {
  let app: express.Express;
  let server: Awaited<ReturnType<typeof startTestEchoServer>>;

  beforeAll(async () => {
    server = await startTestEchoServer();
    const router = await createRouter();
    app = express();
    app.use(router);
    app.use(mockErrorHandler());
  });

  afterAll(async () => {
    await server.stop();
  });

  it('invokes a real unary RPC', async () => {
    const response = await request(app)
      .post('/invoke')
      .send({
        protoText: TEST_PROTO,
        serviceName: 'EchoService',
        methodName: 'Echo',
        address: server.address,
        request: { message: 'hi' },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      responseStream: false,
      responses: [{ message: 'echo: hi' }],
    });
  });

  it('rejects a malformed request body', async () => {
    const response = await request(app)
      .post('/invoke')
      .send({ serviceName: 'EchoService' });

    expect(response.status).toBe(400);
  });
});
