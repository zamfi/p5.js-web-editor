import uuid from 'node-uuid';
import policy from 's3-policy';
import s3 from 's3';
import rimraf from 'rimraf';
import path from 'path';
import { getProjectsForUserId } from './project.controller';
import { findUserByUsername } from './user.controller';


const client = s3.createClient({
  maxAsyncS3: 20,
  s3RetryCount: 3,
  s3RetryDelay: 1000,
  multipartUploadThreshold: 20971520, // this is the default (20 MB)
  multipartUploadSize: 15728640, // this is the default (15 MB)
  s3Options: {
    accessKeyId: `${process.env.AWS_ACCESS_KEY}`,
    secretAccessKey: `${process.env.AWS_SECRET_KEY}`,
    region: `${process.env.AWS_REGION}`
  },
});

const s3Bucket = process.env.S3_BUCKET_URL_BASE ||
                 `https://s3-${process.env.AWS_REGION}.amazonaws.com/${process.env.S3_BUCKET}/`;

export function getExtension(filename) {
  const i = filename.lastIndexOf('.');
  return (i < 0) ? '' : filename.substr(i);
}

export function uploadFileToS3(req, res) {
  if (req.files.length === 0) {
    return res.status(400).json({ message: 'Request must contain at least one file.' });
  }
  const s3BucketHttps = process.env.S3_BUCKET_URL_BASE ||
    `https://s3-${process.env.AWS_REGION}.amazonaws.com/${process.env.S3_BUCKET}/`;
  const uploader = client.uploadDir({
    localDir: req.files[0].destination,
    s3Params: {
      Bucket: process.env.S3_BUCKET,
      ACL: 'public-read',
      Prefix: `${req.user.id}/`
    }
  });
  const uploadFiles = [];

  uploader.on('error', (error) => {
    console.log(error);
    res.status(500).send({ error });
  });
  uploader.on('progress', () => {
    console.log("progress", uploader.progressAmount, uploader.progressTotal);
  });
  uploader.on('fileUploadStart', (localFilePath, s3Key) => {
    uploadFiles.push({
      url: `${s3BucketHttps}${s3Key}`,
      path: localFilePath 
    });
  });
  uploader.on('end', () => {
    console.log(req.files[0].destination);
    const parentPath = path.resolve(req.files[0].destination, '../');
    console.log(parentPath);
    rimraf(parentPath, () => {
      const responseFiles = uploadFiles.map((file) => {
        const foundFile = req.files.find(reqFile => reqFile.path === file.path);
        return {url: file.url, name: foundFile.originalname};
      });
      res.json({files: responseFiles });
    });
  });
}

export function getObjectKey(url) {
  const urlArray = url.split('/');
  let objectKey;
  if (urlArray.length === 6) {
    const key = urlArray.pop();
    const userId = urlArray.pop();
    objectKey = `${userId}/${key}`;
  } else {
    const key = urlArray.pop();
    objectKey = key;
  }
  return objectKey;
}

export function deleteObjectsFromS3(keyList, callback) {
  const keys = keyList.map((key) => { return { Key: key }; }); // eslint-disable-line
  if (keyList.length > 0) {
    const params = {
      Bucket: `${process.env.S3_BUCKET}`,
      Delete: {
        Objects: keys,
      },
    };
    const del = client.deleteObjects(params);
    del.on('end', () => {
      if (callback) {
        callback();
      }
    });
  } else if (callback) {
    callback();
  }
}

export function deleteObjectFromS3(req, res) {
  const objectKey = req.params.object_key;
  deleteObjectsFromS3([objectKey], () => {
    res.json({ success: true });
  });
}

export function signS3(req, res) {
  const fileExtension = getExtension(req.body.name);
  const filename = uuid.v4() + fileExtension;
  const acl = 'public-read';
  const p = policy({
    acl,
    secret: process.env.AWS_SECRET_KEY,
    length: 5000000, // in bytes?
    bucket: process.env.S3_BUCKET,
    key: filename,
    expires: new Date(Date.now() + 60000),
  });
  const result = {
    AWSAccessKeyId: process.env.AWS_ACCESS_KEY,
    key: `${req.body.userId}/${filename}`,
    policy: p.policy,
    signature: p.signature
  };
  return res.json(result);
}

export function copyObjectInS3(req, res) {
  const { url } = req.body;
  const objectKey = getObjectKey(url);
  const fileExtension = getExtension(objectKey);
  const newFilename = uuid.v4() + fileExtension;
  const userId = req.user.id;
  const params = {
    Bucket: `${process.env.S3_BUCKET}`,
    CopySource: `${process.env.S3_BUCKET}/${objectKey}`,
    Key: `${userId}/${newFilename}`,
    ACL: 'public-read'
  };
  const copy = client.copyObject(params);
  copy.on('err', (err) => {
    console.log(err);
  });
  copy.on('end', (data) => {
    res.json({ url: `${s3Bucket}${userId}/${newFilename}` });
  });
}

export function listObjectsInS3ForUser(req, res) {
  const { username } = req.user;
  findUserByUsername(username, (user) => {
    const userId = user.id;
    const params = {
      s3Params: {
        Bucket: `${process.env.S3_BUCKET}`,
        Prefix: `${userId}/`
      }
    };
    let assets = [];
    client.listObjects(params)
      .on('data', (data) => {
        assets = assets.concat(data.Contents.map(object => ({ key: object.Key, size: object.Size })));
      })
      .on('end', () => {
        const projectAssets = [];
        getProjectsForUserId(userId).then((projects) => {
          let totalSize = 0;
          assets.forEach((asset) => {
            const name = asset.key.split('/').pop();
            const foundAsset = {
              key: asset.key,
              name,
              size: asset.size,
              url: `${process.env.S3_BUCKET_URL_BASE}${asset.key}`
            };
            totalSize += asset.size;
            projects.some((project) => {
              let found = false;
              project.files.some((file) => {
                if (!file.url) return false;
                if (file.url.includes(asset.key)) {
                  found = true;
                  foundAsset.name = file.name;
                  foundAsset.sketchName = project.name;
                  foundAsset.sketchId = project.id;
                  foundAsset.url = file.url;
                  return true;
                }
                return false;
              });
              return found;
            });
            projectAssets.push(foundAsset);
          });
          res.json({ assets: projectAssets, totalSize });
        });
      });
  });
}
