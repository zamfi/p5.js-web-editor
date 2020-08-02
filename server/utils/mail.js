/**
 * Mail service wrapping around mailgun
 */

import nodemailer from 'nodemailer';
// import mg from 'nodemailer-mailgun-transport';

// const auth = {
//   api_key: process.env.MAILGUN_KEY,
//   domain: process.env.MAILGUN_DOMAIN,
// };

class Mail {
  constructor() {
    this.createAccountAndTransport();
    this.sendOptions = {
      from: process.env.EMAIL_SENDER,
    };
  }

  sendMail(mailOptions) {
    return new Promise((resolve, reject) => {
      this.client.sendMail(mailOptions, (err, info) => {
        resolve(err, info);
      });
    });
  }

  dispatchMail(data, callback) {
    const mailOptions = {
      to: data.to,
      subject: data.subject,
      from: this.sendOptions.from,
      html: data.html,
    };

    return this.sendMail(mailOptions)
      .then((err, res) => {
        callback(err, res);
      });
  }

  send(data, callback) {
    return this.dispatchMail(data, callback);
  }

  async createAccountAndTransport() {
    this.testAccount = await nodemailer.createTestAccount();
    console.log('created fake ethereal account at', JSON.stringify(this.testAccount));
    this.client = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.testAccount.user, // generated ethereal user
        pass: this.testAccount.pass, // generated ethereal password
      },
    });
  }
}

export default new Mail();
