import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import catalogGraphPlugin from '@backstage/plugin-catalog-graph/alpha';
import { navModule } from './modules/nav';
import { homeModule } from './modules/home';
import { grpcDocsModule } from './modules/grpcDocs';

export default createApp({
  features: [
    catalogPlugin,
    catalogGraphPlugin,
    navModule,
    homeModule,
    grpcDocsModule,
  ],
});
