import { invokeGrpcMethod } from './grpcInvoker';
import { startTestEchoServer, TEST_PROTO } from './testFixtures/testGrpcServer';

describe('invokeGrpcMethod', () => {
  let server: Awaited<ReturnType<typeof startTestEchoServer>>;

  beforeAll(async () => {
    server = await startTestEchoServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('makes a real unary call against a live gRPC server', async () => {
    const result = await invokeGrpcMethod({
      protoText: TEST_PROTO,
      serviceName: 'test.v1.EchoService',
      methodName: 'Echo',
      address: server.address,
      request: { message: 'hello' },
    });

    expect(result.responseStream).toBe(false);
    expect(result.responses).toEqual([{ message: 'echo: hello' }]);
  });

  it('makes a real server-streaming call against a live gRPC server', async () => {
    const result = await invokeGrpcMethod({
      protoText: TEST_PROTO,
      serviceName: 'EchoService',
      methodName: 'EchoStream',
      address: server.address,
      request: { message: 'a b c' },
    });

    expect(result.responseStream).toBe(true);
    expect(result.responses).toEqual([
      { message: 'a' },
      { message: 'b' },
      { message: 'c' },
    ]);
  });

  it('rejects an unknown service', async () => {
    await expect(
      invokeGrpcMethod({
        protoText: TEST_PROTO,
        serviceName: 'NopeService',
        methodName: 'Echo',
        address: server.address,
        request: {},
      }),
    ).rejects.toThrow(/not found/);
  });

  it('rejects an unknown method', async () => {
    await expect(
      invokeGrpcMethod({
        protoText: TEST_PROTO,
        serviceName: 'EchoService',
        methodName: 'Nope',
        address: server.address,
        request: {},
      }),
    ).rejects.toThrow(/not found/);
  });
});
