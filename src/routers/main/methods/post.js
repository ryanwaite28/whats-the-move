'use strict';

const bcrypt = require('bcrypt-nodejs');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const models = require('../../../models').models;
const chamber = require('../../../chamber');
const templateEngine = require('../../../templateEngine');
const cloudinary_manager = require('../../../cloudinary_manager');
const sendgrid_manager = require('../../../sendgrid_manager');



/* --- POST Functions --- */

function sign_up(request, response) {
  (async function() {
    if(request.session.id) { return response.json({ error: true, message: "Client already signed in", online: true, user: request.session.you }) }

    var { displayname, username, email, password, confirmPassword } = request.body;
    if(email) { email = email.toLowerCase().trim(); }
    if(username) { username = username.toLowerCase().trim(); }

    if(!displayname) {
      return response.json({ error: true, message: 'Display Name field is required' });
    }
    if(!username) {
      return response.json({ error: true, message: 'Username field is required' });
    }
    if(!email) {
      return response.json({ error: true, message: 'Email Address field is required' });
    }
    if(!password) {
      return response.json({ error: true, message: 'Password field is required' });
    }
    if(!confirmPassword) {
      return response.json({ error: true, message: 'Confirm Password field is required' });
    }

    if(!chamber.validateDisplayName(displayname)) {
      return response.json({ error: true, message: 'Display name must be letters only, 2-50 characters long. Spaces, dashes and apostrophes are allowed' });
    }
    if(!chamber.validateUsername(username)) {
      return response.json({ error: true, message: 'Username must be letters and numbers only, 2-50 characters long. Dashes and underscores are allowed' });
    }
    if(!chamber.validateEmail(email)) {
      return response.json({ error: true, message: 'Email is invalid. Check Format.' });
    }
    if(!chamber.validatePassword(password)) {
      return response.json({
        error: true,
        message: 'Password must be: at least 7 characters, upper and/or lower case alphanumeric'
      });
    }
    if(password !== confirmPassword) {
      return response.json({ error: true, message: 'Passwords must match' });
    }

    var check_email = await models.Users.findOne({ where: { email } });
    if(check_email) {
      return response.json({ error: true, message: 'Email already in use' });
    }

    var check_username = await models.Users.findOne({ where: { username } });
    if(check_username) {
      return response.json({ error: true, message: 'Username already in use' });
    }

    /* Data Is Valid */

    password = bcrypt.hashSync(password);
    let new_user = await models.Users.create({ displayname, username, email, password });
    let user = new_user.dataValues;
    let new_token = chamber.generateToken(user.id);
    models.Tokens.create({ 
      ip_address: request.ip, 
      user_agent: request.get('user-agent'), 
      user_id: user.id, 
      token: new_token,
      device: request.device.type
    });
    delete user['password'];
    request.session.id = chamber.uniqueValue();
    request.session.you = user;

    // // send verification email
    // let host = request.get('host');
    // let unique_value = response.locals.you.unique_value;
    // let verify_link = host.endsWith('/') ?
    // (host + 'verify_user_email/' + unique_value) :
    // (host + '/verify_user_email/' + unique_value);

    // let email_subject = 'Epsity - Signed Up! Confirm Email';
    // let email_html = templateEngine.SignedUp_EMAIL({ verify_link });
    // sendgrid_manager.send_email(null, response.locals.you.email, email_subject, email_html);

    return response.json({ online: true, user, message: 'Signed Up!', token: new_token });
  })()
}

function sign_out(request, response) {
  request.session.reset();
  return response.json({ online: false, successful: true });
}

function create_review(request, response) {
  (async function(){
    try {
      let { rating, summary, user_id } = request.body;
      if(!user_id) {
        return response.json({ error: true, message: 'User ID is required' });
      }
      if(user_id === response.locals.you.id) {
        return response.json({ error: true, message: 'User ID cannot be your ID' });
      }
      if(!rating) {
        return response.json({ error: true, message: 'Rating field is required; must be only a number, 1-5' });
      }
      else {
        rating = parseInt(rating);
      }
      if(!summary) {
        return response.json({ error: true, message: 'Summary field is required; Mmaximum length is 250 characters; cannot be empty' });
      }
      else {
        summary = summary.trim()
      }

      let new_rating = await models.UserRatings.create({ rating, summary, user_id, writer_id: response.locals.you.id });
      let user = await models.Users.findOne({ where: { id: user_id } });

      let data = new_rating.dataValues;
      let you = response.locals.you;
      data.user = you;

      // // send notification email
      // let host = request.get('host');
      // let profile_link = host.endsWith('/') ? (host + 'users/' + you.username) : (host + '/users/' + you.username);
      // let email_subject = 'Epsity - ' + you.displayname + ' wrote a review about you!';
      // let email_html = templateEngine.NewReview_EMAIL({ you, user, profile_link, review: data });
      // let email_result = await sendgrid_manager.send_email(null, user.email, email_subject, email_html);

      return response.json({ new_review: data, message: 'Rating Created!' });
    }
    catch(e) {
      console.log('error', e);
      return response.json({ e, error: true, message: 'Could not create review...' });
    };
  })()
}

function submit_reset_password_request(request, response) {
  (async function(){
    try {
      if(request.session.id) {
        return response.json({ error: true, message: 'password reset cannot be requested during an sctive session' });
      }

      let { email } = request.body;
      let user, reset_request;
      if(email) {
        email = email.toLowerCase().trim();
      }
      if(!email) {
        return response.json({ error: true, message: 'input is required' });
      }

      let user_result = await models.Users.findOne({ where: { email } });
      if(!user_result) { return response.json({ error: true, message: 'No account found by that email' }); }
      user = user_result.dataValues;

      let request_result = await models.ResetPasswordRequests.findOne({ where: { user_email: user.email } });
      if(request_result) { return response.json({ error: true, message: 'A password reset has already been requested for this email' }); }

      let new_reset_request = await models.ResetPasswordRequests.create({ user_email: user.email });
      reset_request = new_reset_request.dataValues;

      // send reset request email
      let host = request.get('host');
      let link = host.endsWith('/') ? (host + 'reset_password') : (host + '/reset_password');
      let email_subject = 'Epsity - Password reset requested';
      let email_html = templateEngine.PasswordReset_EMAIL({ user, reset_request, link });

      let email_result = await sendgrid_manager.send_email(null, user.email, email_subject, email_html);
      return response.json({ success: true, message: 'A password reset request has been sent to the provided email!' });
    }
    catch(e) {
      console.log(e);
      return response.json({ e, error, message: 'Could not sumbit reset password request...' });
    }
  })()
}



/*  Exports  */

module.exports = {
  sign_up,
  sign_out,
  create_review,
  submit_reset_password_request
}
