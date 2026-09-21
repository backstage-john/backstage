import { startTestBackend } from '@backstage/backend-test-utils';
import request from 'supertest';
import { grpcExplorerPlugin } from './plugin';
import { startTestEchoServer, TEST_PROTO } from './testFixtures/testGrpcServer';

describe('plugin', () => {
  it('invokes a real gRPC method end-to-end through the backend plugin', async () => {
    const server = await startTestEchoServer();
    try {
      const { server: httpServer } = await startTestBackend({
        features: [grpcExplorerPlugin],
      });

      const response = await request(httpServer)
        .post('/api/grpc-explorer/invoke')
        .send({
          protoText: TEST_PROTO,
          serviceName: 'EchoService',
          methodName: 'Echo',
          address: server.address,
          request: { message: 'integration' },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        responseStream: false,
        responses: [{ message: 'echo: integration' }],
      });
    } finally {
      await server.stop();
    }
  });
});
