import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { createRouter } from './router';

/**
 * grpcExplorerPlugin backend plugin
 *
 * Exposes a generic gRPC invocation gateway: given a .proto contract, a
 * service/method name, and a live address, it dials the real service with
 * @grpc/grpc-js and returns the response as JSON. Used by the grpc-explorer
 * frontend plugin so API entities of type `grpc` can be called the same way
 * Swagger UI calls OpenAPI entities.
 *
 * @public
 */
export const grpcExplorerPlugin = createBackendPlugin({
  pluginId: 'grpc-explorer',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
      },
      async init({ httpRouter }) {
        httpRouter.use(await createRouter());
      },
    });
  },
});
