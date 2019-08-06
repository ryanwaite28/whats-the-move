'use strict';

const bcrypt = require('bcrypt-nodejs');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const models = require('../../../models').models;
const chamber = require('../../../chamber');
const templateEngine = require('../../../templateEngine');
const cloudinary_manager = require('../../../cloudinary_manager');
const sendgrid_manager = require('../../../sendgrid_manager');


/* --- PUT Functions --- */



function sign_in(request, response) {
  (async function() {
    if(request.session.id) { return response.json({ error: true, message: "Client already signed in", online: true, user: request.session.you }) }
    let { email, password } = request.body;
    if(email) { email = email.toLowerCase(); }
    if(!email) {
      return response.json({ error: true, message: 'Email Address field is required' });
    }
    if(!password) {
      return response.json({ error: true, message: 'Password field is required' });
    }
    var check_account = await models.Users.findOne({
      where: { [Op.or]: [{email: email}, {username: email}] }
    });
    if(!check_account) {
      return response.json({ error: true, message: 'Invalid credentials.' });
    }
    if(bcrypt.compareSync(password, check_account.dataValues.password) === false) {
      return response.json({ error: true, message: 'Invalid credentials.' });
    }
    var user = check_account.dataValues;
    delete user['password'];
    request.session.id = chamber.uniqueValue();
    request.session.you = user;

    let session_token = await models.Tokens.findOne({ where: { ip_address: request.ip, user_agent: request.get('user-agent'), user_id: user.id } });
    if(session_token) {
      return response.json({ online: true, user, token: session_token.dataValues.token, message: 'Signed In!' });
    }
    else {
      let new_token = chamber.generateToken(user.id);
      models.Tokens.create({ 
        ip_address: request.ip, 
        user_agent: request.get('user-agent'), 
        user_id: user.id, 
        token: new_token, 
        device: request.device.type 
      });
      return response.json({ online: true, user, token: new_token, message: 'Signed In!' });
    }
  })()
}

function sign_out(request, response) {
  request.session.reset();
  return response.json({ online: false, successful: true });
}


/*  Account Handlers  */

function change_user_password(request, response) {
  let { old_password, new_password, new_password_verify } = request.body;
  if(!old_password) {
    return response.json({ error: true, message: 'Old Password field is required' });
  }
  if(!new_password) {
    return response.json({ error: true, message: 'New Password field is required' });
  }
  if(!new_password_verify) {
    return response.json({ error: true, message: 'New Password Confirmation field is required' });
  }
  if(!chamber.validatePassword(new_password)) {
    return response.json({
      error: true,
      message: 'New Password must be: at least 7 characters, upper and/or lower case alphanumeric'
    });
  }
  if(new_password !== new_password_verify) {
    return response.json({ error: true, message: 'New Passwords must match' });
  }
  models.Users.findOne({ where: { id: response.locals.you.id } })
  .then(account => {
    if(bcrypt.compareSync(old_password, account.dataValues.password) === false) {
      return response.json({
        error: true,
        message: 'Old Password is incorrect'
      });
    }
    models.Users.update({ password: bcrypt.hashSync(new_password) }, { where: { id: response.locals.you.id } })
    .then(resp => {
      return response.json({
        message: 'Password updated successfully!'
      });
    })
    .catch(err => {
      console.log('err', err);
      return response.json({ error: true, message: 'could not upload...' });
    });
  })
  .catch(err => {
    console.log('err', err);
    return response.json({ error: true, message: 'could not upload...' });
  });
}

function update_icon(request, response) {
  let icon_file = request.files && request.files.icon_file || null;
  if(!icon_file) {
    return response.json({ error: true, message: 'No file was uploaded...' });
  }
  let allowed = ['jpeg', 'jpg', 'png'];
  let type = icon_file.mimetype.split('/')[1];
  if(!allowed.includes(type)) {
    return response.json({ error: true, message: 'Invalid file type: jpg, jpeg or png required...' });
  }

  cloudinary_manager.store(icon_file, response.locals.you.icon_id)
  .then(obj => {
    let cloudinary_image_id = obj.result.public_id;
    let cloudinary_image_link = obj.result.secure_url;
    models.Users.update({ icon_id: cloudinary_image_id, icon_link: cloudinary_image_link }, { where: { id: response.locals.you.id } })
    .then(res => {
      response.locals.you.icon_id = cloudinary_image_id;
      response.locals.you.icon_link = cloudinary_image_link;
      return response.json({ user: response.locals.you, message: 'Icon Updated!' });
    })
    .catch(e => {
      console.log(e);
      return response.json({ error: true, message: 'Could not update...' });
    })
  })
  .catch(e => {
    console.log(e);
    return response.json({ error: true, message: 'Could not upload...' });
  })
}

function update_info(request, response) {
  (async function(){
    let { displayname, username } = request.body;
    if(username) { username = username.toLowerCase(); }

    if(!displayname) {
      return response.json({ error: true, message: 'Display Name field is required' });
    }
    if(!username) {
      return response.json({ error: true, message: 'Username field is required' });
    }
    if(!chamber.validateDisplayName(displayname)) {
      return response.json({ error: true, message: 'Display name must be letters only, 2-50 characters long. Spaces, dashes and apostrophes are allowed' });
    }
    if(!chamber.validateUsername(username)) {
      return response.json({ error: true, message: 'Username must be letters and numbers only, 2-50 characters long. Dashes and underscores are allowed' });
    }

    if(username === response.locals.you.username) {
      models.Users.update({ displayname }, { where: { id: response.locals.you.id } })
      .then(resp => {
        response.locals.you.displayname = displayname;
        return response.json({ user: response.locals.you, message: 'Info Updated!' });
      })
      .catch(e => {
        console.log(e);
        return response.json({ error: e || true, message: 'Error updating info...' });
      })
    }
    else {
      var check_username = await models.Users.findOne({ where: { username } });
      if(check_username) {
        return response.json({ error: true, message: 'Username already in use' });
      }
      models.Users.update({ displayname, username }, { where: { id: response.locals.you.id } })
      .then(resp => {
        response.locals.you.displayname = displayname;
        response.locals.you.username = username;
        return response.json({ user: response.locals.you, message: 'Info Updated!' });
      })
      .catch(e => {
        console.log(e);
        return response.json({ error: e || true, message: 'Error updating info...' });
      })
    }
  })()
}

function update_link(request, response) {
  let { link_href } = request.body;
  if(link_href) { link_href = link_href.trim(); }

  if(link_href) {
    if(!chamber.validateURL(link_href)) {
      return response.json({ error: true, message: 'Link is invalid. Check format.' });
    }
    if(link_href.length > 250) {
      return response.json({ error: true, message: 'Link is too long.' });
    }
  }
  else {
    link_href = '';
  }

  models.Users.update({ link_href }, { where: { id: response.locals.you.id } })
  .then(resp => {
    response.locals.you.link_href = link_href;
    return response.json({ user: response.locals.you, message: 'Link Updated!' });
  })
  .catch(e => {
    console.log(e);
    return response.json({ error: e || true, message: 'Error updating link...' });
  })
}

function update_bio(request, response) {
  let { bio } = request.body;
  if(bio) {
    bio = bio.trim();
    if(bio.length > 250) {
      return response.json({ error: true, message: 'Bio field is too long' });
    }
  }
  else {
    bio = '';
  }
  models.Users.update({ bio }, { where: { id: response.locals.you.id } })
  .then(resp => {
    response.locals.you.bio = bio;
    return response.json({ user: response.locals.you, message: 'Bio Updated!' });
  })
  .catch(e => {
    console.log(e);
    return response.json({ error: e || true, message: 'Error updating bio...' });
  })
}

function update_email(request, response) {
  (async function(){
    let { email, password } = request.body;
    if(email) { email = email.toLowerCase(); }
    if(!email) {
      return response.json({ error: true, message: 'Email Address field is required' });
    }
    if(!chamber.validateEmail(email)) {
      return response.json({ error: true, message: 'Email is invalid. Check Format.' });
    }
    var check_email = await models.Users.findOne({ where: { email } });
    if(check_email) {
      return response.json({ error: true, message: 'Email already in use' });
    }
    models.Users.update({ email }, { where: { id: response.locals.you.id } })
    .then(resp => {
      response.locals.you.email = email;
      return response.json({ user: response.locals.you, message: 'Email Updated!' });
    })
    .catch(e => {
      console.log(e);
      return response.json({ error: e || true, message: 'Error updating info...' });
    })
  })()
}

function submit_password_reset_code(request, response) {
  (async function(){
    try {
      if(request.session.id) {
        return response.json({ error: true, message: 'password reset cannot be requested during an sctive session' });
      }

      let { code } = request.body;
      let user, reset_request;
      if(!code) {
        return response.json({ error: true, message: 'reset code is required' });
      }

      let request_result = await models.ResetPasswordRequests.findOne({ where: { unique_value: code } });
      if(!request_result) { return response.json({ error: true, message: 'Invalid code, no reset request found by that value' }); }
      reset_request = request_result.dataValues;

      let user_result = await models.Users.findOne({ where: { email: reset_request.user_email } });
      if(!user_result) {
        return response.json({ error: true, message: 'error loading user from reset request...' });
      }
      user = user_result.dataValues;
      let password = chamber.uniqueValue();
      let hash = bcrypt.hashSync(password);
      let update_result = await models.Users.update({ password: hash }, { where: { id: user.id } });
      let delete_result = await models.ResetPasswordRequests.destroy({ where: { id: reset_request.id } });

      // send new password email
      let host = request.get('host');
      let link = host.endsWith('/') ? (host + 'signin') : (host + '/signin');
      let email_subject = 'Epsity - Password reset successful!';
      let email_html = templateEngine.PasswordResetSuccess_EMAIL({ user, password, link });

      let email_result = await sendgrid_manager.send_email(null, user.email, email_subject, email_html);

      return response.json({ success: true, message: 'The Password has been reset!' });
    }
    catch(e) {
      console.log(e);
      return response.json({ e, error: true, message: 'Could not reset password...' });
    }
  })()
}




/* --- Exports --- */

module.exports = {
  sign_out,
  sign_in,
  change_user_password,
  update_icon,
  update_info,
  update_link,
  update_bio,
  update_email,
  submit_password_reset_code
}
