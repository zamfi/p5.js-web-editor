import { Router } from 'express';
import passport from 'passport';
import multer from 'multer';
import * as AWSController from '../controllers/aws.controller';

const router = new Router();
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, '/tmp')
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}`)
  }
});
const upload = multer({ storage });

router.post(
  '/:username/files/upload',
  passport.authenticate('basic', { session: false }),
  upload.single('media'),
  AWSController.uploadFileToS3
);

export default router;
