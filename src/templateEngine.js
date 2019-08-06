'use strict';

const nunjucks = require('nunjucks');

function installExpressApp(app) {
  nunjucks.configure( __dirname + '/templates/' , {
    autoescape: true,
    express: app
  });
}

/* --- Emails --- */

function SignedUp_EMAIL(data) {
  return nunjucks.render('emails/SignedUp.html', { data });
}

function ContactUser_EMAIL(data) {
  return nunjucks.render('emails/ContactUser.html', { data });
}

function PasswordReset_EMAIL(data) {
  return nunjucks.render('emails/PasswordReset.html', { data });
}

function PasswordResetSuccess_EMAIL(data) {
  return nunjucks.render('emails/PasswordResetSuccess.html', { data });
}

function NewReview_EMAIL(data) {
  return nunjucks.render('emails/NewReview.html', { data });
}

/* --- Exports --- */

module.exports = {
  nunjucks,
  installExpressApp,
  SignedUp_EMAIL,
  ContactUser_EMAIL,
  PasswordReset_EMAIL,
  PasswordResetSuccess_EMAIL,
  NewReview_EMAIL
}
