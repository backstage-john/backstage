import { useMemo, useState } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi, fetchApiRef } from '@backstage/frontend-plugin-api';
import {
  CodeSnippet,
  Content,
  ContentHeader,
  EmptyState,
  InfoCard,
} from '@backstage/core-components';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import {
  coerceFieldValue,
  fieldInputKind,
  parseGrpcContract,
  type GrpcMethodModel,
} from './protoReflection';

const ENDPOINT_ANNOTATION = 'grpc-explorer.io/endpoint';

interface InvokeResponse {
  responseStream: boolean;
  responses: unknown[];
}

function FieldInput({
  method,
  values,
  onChange,
}: {
  method: GrpcMethodModel;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  if (method.requestFields.length === 0) {
    return <p>This method's request message has no fields.</p>;
  }

  return (
    <>
      {method.requestFields.map(field => {
        const kind = fieldInputKind(field);
        const value = values[field.name] ?? '';
        const label = `${field.name} (${field.type}${field.repeated ? '[]' : ''})`;

        if (kind === 'boolean') {
          return (
            <div key={field.name} style={{ marginBottom: 12 }}>
              <label>
                <input
                  type="checkbox"
                  checked={value === 'true'}
                  onChange={e => onChange(field.name, String(e.target.checked))}
                />{' '}
                {label}
              </label>
            </div>
          );
        }

        if (kind === 'json') {
          return (
            <div key={field.name} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>{label}</label>
              <textarea
                style={{ width: '100%', fontFamily: 'monospace' }}
                rows={3}
                placeholder={field.repeated ? '[]' : '{}'}
                value={value}
                onChange={e => onChange(field.name, e.target.value)}
              />
            </div>
          );
        }

        return (
          <div key={field.name} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>{label}</label>
            <input
              type={kind === 'number' ? 'number' : 'text'}
              style={{ width: '100%' }}
              value={value}
              onChange={e => onChange(field.name, e.target.value)}
            />
          </div>
        );
      })}
    </>
  );
}

/**
 * Generic "try it out" style explorer for any API entity whose `.proto`
 * contract can be parsed with protobufjs — mirrors what Swagger UI does for
 * OpenAPI entities, but for gRPC. Lists services/methods from the contract
 * and invokes the selected one through the grpc-explorer backend plugin,
 * which dials the live address declared in the entity's
 * `grpc-explorer.io/endpoint` annotation.
 */
export function GrpcServiceExplorer() {
  const { entity } = useEntity();
  const { fetch } = useApi(fetchApiRef);

  const protoText = (entity.spec as { definition?: string } | undefined)
    ?.definition;
  const endpoint = entity.metadata.annotations?.[ENDPOINT_ANNOTATION];

  const services = useMemo(() => {
    if (!protoText) return [];
    try {
      return parseGrpcContract(protoText);
    } catch {
      return [];
    }
  }, [protoText]);

  const [serviceIndex, setServiceIndex] = useState(0);
  const [methodIndex, setMethodIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvokeResponse | null>(null);

  if (!protoText) {
    return (
      <Content>
        <EmptyState
          missing="content"
          title="No gRPC contract found"
          description="This API entity has no spec.definition to introspect."
        />
      </Content>
    );
  }

  if (services.length === 0) {
    return (
      <Content>
        <EmptyState
          missing="content"
          title="Couldn't find a service in this contract"
          description="protobufjs couldn't find any `service` definitions in this entity's .proto source."
        />
      </Content>
    );
  }

  const service = services[serviceIndex];
  const method = service.methods[methodIndex];

  function selectService(index: number) {
    setServiceIndex(index);
    setMethodIndex(0);
    setFieldValues({});
    setResult(null);
    setError(null);
  }

  function selectMethod(index: number) {
    setMethodIndex(index);
    setFieldValues({});
    setResult(null);
    setError(null);
  }

  async function invoke() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (!endpoint) {
        throw new Error(
          `This entity has no "${ENDPOINT_ANNOTATION}" annotation, so there's no live address to call.`,
        );
      }

      const request: Record<string, unknown> = {};
      for (const field of method.requestFields) {
        const raw = fieldValues[field.name];
        if (raw === undefined || raw === '') continue;
        request[field.name] = coerceFieldValue(field, raw);
      }

      const response = await fetch(`plugin://grpc-explorer/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protoText,
          serviceName: service.fullName,
          methodName: method.name,
          address: endpoint,
          request,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? `Request failed with status ${response.status}`);
      }
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Content>
      <ContentHeader title="gRPC Explorer" />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <InfoCard title="Call a method">
            {services.length > 1 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Service</label>
                <select
                  style={{ width: '100%' }}
                  value={serviceIndex}
                  onChange={e => selectService(Number(e.target.value))}
                >
                  {services.map((s, i) => (
                    <option key={s.fullName} value={i}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Method</label>
              <select
                style={{ width: '100%' }}
                value={methodIndex}
                onChange={e => selectMethod(Number(e.target.value))}
              >
                {service.methods.map((m, i) => (
                  <option key={m.name} value={i}>
                    {m.name}
                    {m.responseStream ? ' (server-streaming)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <FieldInput method={method} values={fieldValues} onChange={(name, value) =>
              setFieldValues(prev => ({ ...prev, [name]: value }))
            } />

            {!endpoint && (
              <p style={{ color: '#b71c1c' }}>
                Missing <code>{ENDPOINT_ANNOTATION}</code> annotation — add
                it to this entity to enable live calls.
              </p>
            )}

            <Button
              variant="contained"
              color="primary"
              disabled={loading || !endpoint}
              onClick={invoke}
            >
              {loading ? <CircularProgress size={20} /> : `Call ${method.name}`}
            </Button>
          </InfoCard>
        </Grid>

        <Grid item xs={12} md={6}>
          {error && (
            <InfoCard title="Error">
              <p style={{ color: '#b71c1c' }}>{error}</p>
            </InfoCard>
          )}
          {result && (
            <InfoCard
              title={
                result.responseStream
                  ? `Response (${result.responses.length} streamed messages)`
                  : 'Response'
              }
            >
              <CodeSnippet
                text={JSON.stringify(result.responses, null, 2)}
                language="json"
                showLineNumbers
                showCopyCodeButton
              />
            </InfoCard>
          )}
        </Grid>
      </Grid>
    </Content>
  );
}
