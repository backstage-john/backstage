import { useEntity } from '@backstage/plugin-catalog-react';
import { CodeSnippet, Content, ContentHeader, InfoCard } from '@backstage/core-components';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Chip from '@material-ui/core/Chip';
import { parseProto } from './parseProto';

function methodSignature(type: string, streaming: boolean) {
  return streaming ? `stream ${type}` : type;
}

export function GrpcDefinitionPage() {
  const { entity } = useEntity();
  const definition = (entity.spec as { definition?: string } | undefined)?.definition;

  if (!definition) {
    return (
      <Content>
        <Typography>This API entity has no gRPC definition.</Typography>
      </Content>
    );
  }

  const { packageName, services, messages } = parseProto(definition);

  return (
    <Content>
      <ContentHeader title="gRPC Contract" />
      {packageName && (
        <Typography variant="body2" color="textSecondary" gutterBottom>
          package {packageName}
        </Typography>
      )}

      {services.length === 0 && (
        <Typography color="textSecondary" gutterBottom>
          No <code>service</code> definitions were found in this .proto file.
        </Typography>
      )}

      {services.map(service => (
        <InfoCard key={service.name} title={`service ${service.name}`}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>RPC</TableCell>
                <TableCell>Request</TableCell>
                <TableCell>Response</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {service.rpcs.map(rpc => (
                <TableRow key={rpc.name}>
                  <TableCell>
                    <code>{rpc.name}</code>
                  </TableCell>
                  <TableCell>
                    {methodSignature(rpc.requestType, rpc.requestStreaming)}
                  </TableCell>
                  <TableCell>
                    {methodSignature(rpc.responseType, rpc.responseStreaming)}
                    {(rpc.requestStreaming || rpc.responseStreaming) && (
                      <Chip
                        label="streaming"
                        size="small"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </InfoCard>
      ))}

      {messages.length > 0 && (
        <InfoCard title="Messages">
          {messages.map(message => (
            <div key={message.name} style={{ marginBottom: 16 }}>
              <Typography variant="subtitle2">
                <code>message {message.name}</code>
              </Typography>
              <Table size="small">
                <TableBody>
                  {message.fields.map(field => (
                    <TableRow key={field}>
                      <TableCell>
                        <code>{field}</code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </InfoCard>
      )}

      <InfoCard title="Raw .proto source">
        <CodeSnippet
          text={definition}
          language="protobuf"
          showLineNumbers
          showCopyCodeButton
        />
      </InfoCard>
    </Content>
  );
}
