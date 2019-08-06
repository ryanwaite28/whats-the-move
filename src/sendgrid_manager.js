function send_email(from, to, subject, html) {
  return new Promise((resolve, reject) => {
    const api_key = process.env.SENDGRID_API_KEY;
    if(!api_key) {
      const msgError = `Sendgrid credential is missing; mailing attempt canceled.`;
      console.log({ error: msgError });
      return reject({ error: msgError });
    }

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(api_key);

    const email = { from: from || process.env.SENDGRID_USER_EMAIL, to, subject, html };
    sgMail.send(email)
    .then(result => {
      console.log('email sent ---');
      console.log(result);
      return resolve({ result });
    })
    .catch(error => {
      console.log('email failed ---');
      console.log(error);
      return reject({ error });
    })
  });
}



module.exports = {
  // sgMail,
  send_email,
}