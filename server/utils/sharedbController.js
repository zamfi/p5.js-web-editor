// run ShareDB extensions
import http from 'http';
import WebSocket from 'ws';
import WebSocketJSONStream from 'websocket-json-stream';
import ShareDB from 'sharedb';
import ShareDBmongo from 'sharedb-mongo';

const SHAREDB_PORT = 8112;

const db = ShareDBmongo('mongodb://localhost:27017/');
const sharedb = new ShareDB({ db });
const connection = sharedb.connect();

export function start() {
  const server = http.createServer();
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const stream = new WebSocketJSONStream(ws);
    sharedb.listen(stream);
  });
  server.listen(SHAREDB_PORT, () => {
    console.log(`ShareDB: listening on port ${SHAREDB_PORT}`);
  });
  // var app = express();
  // app.use(express.static('.'));
  // app.use(express.static('../node_modules'));
  // app.listen(ports.app, () => {
  //   console.log(`App: listening on port ${ports.app}`);
  // });
}


const control = {
  createDoc(project, fileId, fileContent) {
    console.log('making a file at', fileId, 'with', fileContent);
    connection.get('files', fileId).create({ content: fileContent });
  }
};

export default control;
