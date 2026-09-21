import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';

const grpcExplorerContent = EntityContentBlueprint.make({
  name: 'grpc-explorer',
  params: {
    path: '/grpc-explorer',
    title: 'gRPC Explorer',
    filter: entity =>
      entity.kind.toLocaleLowerCase() === 'api' &&
      (entity.spec as { type?: string } | undefined)?.type === 'grpc',
    loader: () =>
      import('./GrpcServiceExplorer').then(m => <m.GrpcServiceExplorer />),
  },
});

export const grpcExplorerPlugin = createFrontendPlugin({
  pluginId: 'grpc-explorer',
  extensions: [grpcExplorerContent],
});
