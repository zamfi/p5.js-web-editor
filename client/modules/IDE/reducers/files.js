import ShareDB from 'sharedb/lib/client';

import objectID from 'bson-objectid';
import * as ActionTypes from '../../../constants';

const defaultSketch = `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
}`;

const defaultHTML =
`<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.10.2/p5.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.10.2/addons/p5.sound.min.js"></script>
    <link rel="stylesheet" type="text/css" href="style.css">
    <meta charset="utf-8" />

  </head>
  <body>
    <script src="sketch.js"></script>
  </body>
</html>
`;

const defaultCSS =
`html, body {
  margin: 0;
  padding: 0;
}
canvas {
  display: block;
}
`;

const initialState = () => {
  const a = objectID().toHexString();
  const b = objectID().toHexString();
  const c = objectID().toHexString();
  const r = objectID().toHexString();
  return [
    {
      name: 'root',
      id: r,
      _id: r,
      children: [a, b, c],
      fileType: 'folder',
      content: ''
    },
    {
      name: 'sketch.js',
      content: defaultSketch,
      id: a,
      _id: a,
      isSelectedFile: true,
      fileType: 'file',
      children: []
    },
    {
      name: 'index.html',
      content: defaultHTML,
      id: b,
      _id: b,
      fileType: 'file',
      children: []
    },
    {
      name: 'style.css',
      content: defaultCSS,
      id: c,
      _id: c,
      fileType: 'file',
      children: []
    }];
};

function getAllDescendantIds(state, nodeId) {
  return state.find(file => file.id === nodeId).children
    .reduce((acc, childId) => (
      [...acc, childId, ...getAllDescendantIds(state, childId)]
    ), []);
}

function deleteChild(state, parentId, id) {
  const newState = state.map((file) => {
    if (file.id === parentId) {
      const newFile = Object.assign({}, file);
      newFile.children = newFile.children.filter(child => child !== id);
      return newFile;
    }
    return file;
  });
  return newState;
}

function deleteMany(state, ids) {
  const newState = [...state];
  ids.forEach((id) => {
    let fileIndex;
    newState.find((file, index) => {
      if (file.id === id) {
        fileIndex = index;
      }
      return file.id === id;
    });
    newState.splice(fileIndex, 1);
  });
  return newState;
}

const ports = {
  sharedb: 8112
};

const files = (state, action) => {
  if (state === undefined) {
    if (!window.shareConnection) {
      const ws = new WebSocket(`ws://${window.location.hostname}:${ports.sharedb}`);
      window.shareConnection = new ShareDB.Connection(ws);
    }

    state = initialState(); // eslint-disable-line
    // debugger; // esline-disable-line
    if (!window.shareDocs) {
      window.shareDocs = {};
    }
    state.filter(f => f.fileType === 'file').forEach((file) => {
      window.shareDocs[file.id] = window.shareConnection.get('files', file.id).create({ content: file.content });
      console.log('CREATED FILE', window.shareDocs[file.id], file, 'CONTENT', file.content);
    });
    console.log('CREATED ALL FILES!', window.shareDocs);
  }
  switch (action.type) {
    case ActionTypes.UPDATE_FILE_CONTENT:
      return state.map((file) => {
        if (file.id !== action.id) {
          return file;
        }

        return Object.assign({}, file, { content: action.content });
      });
    case ActionTypes.SET_BLOB_URL:
      return state.map((file) => {
        if (file.id !== action.id) {
          return file;
        }
        return Object.assign({}, file, { blobURL: action.blobURL });
      });
    case ActionTypes.NEW_PROJECT:
      return [...action.files];
    case ActionTypes.SET_PROJECT:
      return [...action.files];
    case ActionTypes.RESET_PROJECT:
      return initialState();
    case ActionTypes.CREATE_FILE: // eslint-disable-line
    {
      const newState = state.map((file) => {
        if (file.id === action.parentId) {
          const newFile = Object.assign({}, file);
          newFile.children = [...newFile.children, action.id];
          return newFile;
        }
        return file;
      });
      if (action.fileType === 'file' || !action.fileType) {
        window.shareDocs[action.id] = window.shareConnection.get('files', action.id).create({ content: action.content });
      }
      return [...newState,
        {
          name: action.name,
          id: action.id,
          _id: action._id,
          content: action.content,
          url: action.url,
          children: action.children,
          fileType: action.fileType || 'file'
        }];
    }
    case ActionTypes.UPDATE_FILE_NAME:
      return state.map((file) => {
        if (file.id !== action.id) {
          return file;
        }

        return Object.assign({}, file, { name: action.name });
      });
    case ActionTypes.DELETE_FILE:
    {
      const newState = deleteMany(state, [action.id, ...getAllDescendantIds(state, action.id)]);
      return deleteChild(newState, action.parentId, action.id);
      // const newState = state.map((file) => {
      //   if (file.id === action.parentId) {
      //     const newChildren = file.children.filter(child => child !== action.id);
      //     return { ...file, children: newChildren };
      //   }
      //   return file;
      // });
      // return newState.filter(file => file.id !== action.id);
    }
    case ActionTypes.SET_SELECTED_FILE:
      return state.map((file) => {
        if (file.id === action.selectedFile) {
          return Object.assign({}, file, { isSelectedFile: true });
        }
        return Object.assign({}, file, { isSelectedFile: false });
      });
    case ActionTypes.SHOW_FOLDER_CHILDREN:
      return state.map((file) => {
        if (file.id === action.id) {
          return Object.assign({}, file, { isFolderClosed: false });
        }
        return file;
      });
    case ActionTypes.HIDE_FOLDER_CHILDREN:
      return state.map((file) => {
        if (file.id === action.id) {
          return Object.assign({}, file, { isFolderClosed: true });
        }
        return file;
      });
    default:
      return state;
  }
};

export const getHTMLFile = state => state.filter(file => file.name.match(/.*\.html$/i))[0];
export const getJSFiles = state => state.filter(file => file.name.match(/.*\.js$/i));
export const getCSSFiles = state => state.filter(file => file.name.match(/.*\.css$/i));
export const getLinkedFiles = state => state.filter(file => file.url);

export default files;
