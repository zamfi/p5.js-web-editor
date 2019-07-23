import { Router } from 'express';
import passport from 'passport';
import multer from 'multer';
import * as AWSController from '../controllers/aws.controller';
import tmp from 'tmp';
import uuid from 'node-uuid';
import fs from 'fs';

const router = new Router();

/** multer config */
let tmpDir = null;
const preuploadMiddleware = (req, res, next) => {
  req.imagesFolder = uuid.v4();
  if (!tmpDir) {
    tmpDir = tmp.dir((err, path) => {
      tmpDir = path;
      next();
    });
  } else {
    next();
  }
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    let path = `${tmpDir}/${req.imagesFolder}`;
    if (fs.existsSync(path)) {
      cb(null, path);
      return;
    }
    fs.mkdirSync(path);
    cb(null, path);
  },
  filename(req, file, cb) {
    const fileExtension = AWSController.getExtension(file.originalname);
    const filename = uuid.v4() + fileExtension;
    cb(null, filename);
  }
});
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5000000 // 5MB
  }
 });
/** end multer config */

router.post(
  '/:username/files/upload',
  passport.authenticate('basic', { session: false }),
  preuploadMiddleware,
  upload.array('media', 10),
  AWSController.uploadFileToS3
);

export default router;
