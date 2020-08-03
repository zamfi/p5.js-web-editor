import http from 'http';
import WebSocket from 'ws';
import WebSocketJSONStream from 'websocket-json-stream';

const SAYANYTHING_PORT = 8113;

const everyone = new Set();

export function startSayAnythingEchoer() {
  const server = http.createServer();
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const stream = new WebSocketJSONStream(ws);
    everyone.add(stream);

    stream.on('close', () => everyone.delete(stream));
    stream.on('data', (msg) => {
      console.log('SAYING', msg);
      everyone.forEach((other) => {
        console.log('...to other?');
        if (other !== stream) {
          try {
            console.log('...yes!');
            other.write(msg);
          } catch (e) {
            console.log('Failed to write to other?', e);
          }
        }
      });
    });
  });
  server.listen(SAYANYTHING_PORT, () => {
    console.log(`SayAnything: listening on port ${SAYANYTHING_PORT}`);
  });
}

const control = {

};

export default control;
