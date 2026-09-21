import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { z } from 'zod/v3';
import { invokeGrpcMethod } from './grpcInvoker';

const invokeSchema = z.object({
  protoText: z.string(),
  serviceName: z.string(),
  methodName: z.string(),
  address: z.string(),
  request: z.record(z.unknown()).default({}),
});

export async function createRouter(): Promise<express.Router> {
  const router = Router();
  router.use(express.json({ limit: '2mb' }));

  // Invokes a single RPC against a live gRPC server, using the .proto
  // contract supplied in the request body — generic over whatever service
  // and method the caller asks for, not tied to any specific API entity.
  router.post('/invoke', async (req, res) => {
    const parsed = invokeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const result = await invokeGrpcMethod(parsed.data);
    res.json(result);
  });

  return router;
}
