import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';

const grpcContractContent = EntityContentBlueprint.make({
  name: 'grpc-contract',
  params: {
    path: '/grpc',
    title: 'gRPC Contract',
    filter: entity =>
      entity.kind.toLocaleLowerCase() === 'api' &&
      (entity.spec as { type?: string } | undefined)?.type === 'grpc',
    loader: () =>
      import('./GrpcDefinitionPage').then(m => <m.GrpcDefinitionPage />),
  },
});

export const grpcDocsModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [grpcContractContent],
});
