// Minimal in-memory RESP server (just enough for ioredis + the app's cache/health calls). Test use only.
import net from 'node:net';

export function startFakeRedis(port = 0) {
  const store = new Map();
  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const parsed = parseCommand(buffer);
        if (!parsed) break;
        buffer = buffer.subarray(parsed.length);
        socket.write(reply(parsed.args, store));
      }
    });
    socket.on('error', () => {});
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

function parseCommand(buf) {
  if (buf[0] !== 0x2a) return null; // '*'
  let pos = buf.indexOf('\r\n');
  if (pos < 0) return null;
  const count = Number(buf.subarray(1, pos).toString());
  pos += 2;
  const args = [];
  for (let i = 0; i < count; i += 1) {
    const end = buf.indexOf('\r\n', pos);
    if (end < 0) return null;
    const size = Number(buf.subarray(pos + 1, end).toString());
    const start = end + 2;
    if (buf.length < start + size + 2) return null;
    args.push(buf.subarray(start, start + size).toString());
    pos = start + size + 2;
  }
  return { args, length: pos };
}

const bulk = (text) => `$${Buffer.byteLength(text)}\r\n${text}\r\n`;
function reply([command, ...args], store) {
  switch (command.toUpperCase()) {
    case 'PING': return '+PONG\r\n';
    case 'INFO': return bulk('# Server\r\nredis_version:7.2.4\r\nloading:0\r\n');
    case 'GET': return store.has(args[0]) ? bulk(store.get(args[0])) : '$-1\r\n';
    case 'SET': store.set(args[0], args[1]); return '+OK\r\n';
    case 'DEL': return `:${args.filter((key) => store.delete(key)).length}\r\n`;
    case 'SCAN': return '*2\r\n$1\r\n0\r\n*0\r\n';
    case 'QUIT': return '+OK\r\n';
    default: return '+OK\r\n';
  }
}
