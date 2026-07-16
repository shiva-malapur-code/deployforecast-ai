import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';

class MemorySocket extends Duplex {
  _read() {}

  _write(_chunk, _encoding, callback) {
    callback();
  }
}

export function requestApp(app, { method = 'GET', path = '/', body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new MemorySocket();
    Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });

    const request = new IncomingMessage(socket);
    request.method = method;
    request.url = path;

    const payload =
      body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    request.headers = Object.fromEntries(
      Object.entries({
        ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
        ...(payload === undefined ? {} : { 'content-length': String(Buffer.byteLength(payload)) }),
        ...headers,
      }).map(([name, value]) => [name.toLowerCase(), String(value)]),
    );
    request.rawHeaders = Object.entries(request.headers).flatMap(([name, value]) => [name, value]);

    const response = new ServerResponse(request);
    const bodyChunks = [];
    let settled = false;
    const originalWrite = response.write.bind(response);
    const originalEnd = response.end.bind(response);

    const finish = () => {
      if (settled) return;
      settled = true;
      const text = Buffer.concat(bodyChunks).toString('utf8');
      resolve({
        status: response.statusCode,
        headers: response.getHeaders(),
        text,
        json: () => JSON.parse(text),
      });
    };

    response.write = (chunk, encoding, callback) => {
      if (chunk !== undefined && chunk !== null) {
        bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return originalWrite(chunk, encoding, callback);
    };
    response.end = (chunk, encoding, callback) => {
      if (chunk !== undefined && chunk !== null) {
        bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      const result = originalEnd(chunk, encoding, callback);
      queueMicrotask(finish);
      return result;
    };

    response.on('error', reject);
    response.on('finish', finish);

    response.assignSocket(socket);
    app.handle(request, response);
    queueMicrotask(() => {
      if (payload !== undefined) request.push(payload);
      request.push(null);
    });
  });
}
