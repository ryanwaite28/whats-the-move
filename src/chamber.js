'use strict';

const bcrypt = require('bcrypt-nodejs');
const uuidv1 = require('uuid/v1');
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const models = require('./models').models;

const specialCaracters = ['!','@','#','$','%','&','+',')',']','}',':',';','?'];
const allowed_images = ['jpg', 'jpeg', 'png', 'JPG', 'JPEG', 'PNG'];
const app_secret = `9td25k!l0zraa4z9lfpo@jb)#WER}{Pojfugk8jgosryt87ktjrhrgf%Pojfugk8jgosrugi+)(UIUpJ{K}Pjghs`;
const algorithm = 'aes-256-ctr';
const token_separator = '|';



const EVENT_TYPES = {
  // EVENT: '',
};

const Notification_Target_Types = {
  USER: 'USER',
  // TYPE: '',
};

/* --- */

function addDays(dateObj, number_of_days) {
   var dat = new Date(dateObj.valueOf())
   dat.setDate(dat.getDate() + number_of_days);
   return dat;
}

function backDays(dateObj, number_of_days) {
   var dat = new Date(dateObj.valueOf())
   dat.setDate(dat.getDate() - number_of_days);
   return dat;
}

function validateEmail(email) {
  if(!email) { return false; }
  if(email.constructor !== String) { return false; }
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email.toLowerCase());
}

function validateName(name) {
  if(!name) { return false; }
  if(name.constructor !== String) { return false; }
  var re = /^[a-zA-Z]{2,50}$/;
  return re.test(name.toLowerCase());
}

function validateDisplayName(DisplayName) {
  if(!DisplayName) { return false; }
  if(DisplayName.constructor !== String) { return false; }
  var re = /^[a-zA-Z\s\'\-\_\.]{2,50}$/;
  return re.test(DisplayName.toLowerCase());
}

function validateUsername(Username) {
  if(!Username) { return false; }
  if(Username.constructor !== String) { return false; }
  var re = /^[a-zA-Z0-9\-\_]{2,50}$/;
  return re.test(Username.toLowerCase());
}

function validateURL(link) {
  if(!link) { return false; }
  if(link.constructor !== String) { return false; }
  var re = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
  return re.test(link.toLowerCase());
}

function validateInteger(number) {
  if(!number) { return false; }
  if(number.constructor !== Number) { return false; }
	var re = /^[0-9]+$/;
	return re.test(number);
}

function validatePassword(password) {
  if(!password) { return false; }
  if(password.constructor !== String) { return false; }

  let hasMoreThanSixCharacters = password.length > 6;
  let hasUpperCase = /[A-Z]/.test(password);
  let hasLowerCase = /[a-z]/.test(password);
  let hasNumbers = /\d/.test(password);
  let hasNonalphas = /\W/.test(password);

  return (
    hasMoreThanSixCharacters &&
    (hasUpperCase || hasLowerCase) &&
    hasNumbers
  );
}

function uniqueValue() {
return String(Date.now()) +
  Math.random().toString(36).substr(2, 34) +
  Math.random().toString(36).substr(2, 34) +
  Math.random().toString(36).substr(2, 34) +
  Math.random().toString(36).substr(2, 34);
}

function greatUniqueValue() {
  return String(Date.now()) + '|' +
    Math.random().toString(36).substr(2, 34) + '|' + 
    uuidv1() + '|' + 
    uuidv4() + '|' + 
    bcrypt.hashSync(app_secret);
}

function capitalize(string) {
  let str = string.toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function encrypt(text){
  var cipher = crypto.createCipher(algorithm, app_secret)
  var crypted = cipher.update(String(text), 'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher(algorithm, app_secret)
  var dec = decipher.update(String(text),'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

function getRandomIndex(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomString(number = 1) {
  let str = ''
  if(!number || number.constructor !== Number || number < 1) {
    number = 1;
  }
  for(let i = 0; i < number; i++) {
    str = str + Math.random().toString(36).substr(2, 34);
  }
  return str;
}

function generateRandomSpecialString(number = 1) {
  let str = ''
  if(!number || number.constructor !== Number || number < 1) {
    number = 1;
  }
  for(let i = 0; i < number; i++) {
    str = str + Math.random().toString(36).substr(2, 34) + getRandomIndex(specialCaracters);
  }
  return str;
}

function generateToken(user_id) {
  let timestamp = Date.now();
  let uuid = uuidv4();
  let hash = encrypt(user_id);
  let randomstring = generateRandomSpecialString(15);

  let token = `${timestamp}${token_separator}${uuid}${token_separator}${hash}${token_separator}${randomstring}`;
  console.log('new token: ', token);
  return token;
}

function CheckToken(request, response, next) {
  (async function(){
    let auth = request.get('Authorization');
    console.log('auth - ', auth);

    // check if token was sent in request header
    if(!auth) {
      return response.json({ error: true, message: 'No Authorization header was set or has no value' });
    }

    // check if token is in correct format
    auth = String(auth);
    let splitter = auth.split(token_separator);
    if(splitter.length !== 4) {
      console.log('splitter - ', splitter);
      return response.json({ error: true, message: 'Token format/structure is invalid' });
    }

    // check if date of token is valid
    let timestamp = new Date(splitter[0]);
    if(!(new Date(timestamp)).valueOf() === false) {
      return response.json({ error: true, message: 'Token date is invalid' });
    }

    // check the user_id of the token
    let user_id;
    try {
      user_id = parseInt(decrypt(splitter[2]));
      if(!user_id) {
        return response.json({ error: true, message: 'Token auth is invalid' });
      }
    } catch(e) {
      console.log(e, 'user_id - ', user_id);
      return response.json({ error: true, message: 'Token auth is invalid' });
    }

    // check if token is in the database
    let token_record = await models.Tokens.findOne({ where: { token: auth, user_agent: request.get('User-Agent'), device: request.device.type } });
    if(!token_record) {
      return response.json({ error: true, message: 'Token does not exist' });
    }
    if(token_record.dataValues.user_id !== user_id) {
      return response.json({ error: true, message: 'Token not authorized' });
    }
    let user_record = await models.Users.findOne({ where: { id: user_id } });
    if(!user_record) {
      return response.json({ error: true, message: 'Token does not match for any user' });
    }

    response.locals.auth = { user_id, user_record, token_record };
    return next();
  })()
}

function SessionRequired(request, response, next) {
  console.log('auth called');
  (async function(){
    if(!request.session.id) {
      let auth = request.get('Authorization'); // user's token
      if(!auth) { return response.status(401).json({ error: true, message: 'No Authorization header...' }); }
      var token_record = await models.Tokens.findOne({ where: { token: auth } });
      if(!token_record) { return response.status(401).json({ error: true, message: 'Auth token is invalid...' }); }
      let token = token_record.dataValues;
      if(token.user_agent !== request.get('user-agent')) {
        return response.status(401).json({ error: true, message: 'Token used from invalid client...' });
      }
      var get_user = await models.Users.findOne({ where: { id: token.user_id } });
      var user = get_user.dataValues;
      delete user['password'];
      response.locals.you = user;
      return next();
    }
    else {
      response.locals.you = request.session.you;
      return next();
    }
  })()
}

const whitelist_domains = [
  // dev origins
  'http://localhost:7600',
  'http://localhost:9500',

  // prod origins
];

const corsOptions = {
  // https://expressjs.com/en/resources/middleware/cors.html
  origin: function (origin, callback) {
    const originIsAllowed = whitelist_domains.includes(origin);
    // console.log({
    //   origin,
    //   callback,
    //   originIsAllowed,
    // });
    if (originIsAllowed) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = {
  EVENT_TYPES,
  Notification_Target_Types,
  app_secret,
  allowed_images,
  validateName,
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateInteger,
  validateUsername,
  validateURL,
  uniqueValue,
  greatUniqueValue,
  capitalize,
  generateToken,
  CheckToken,
  SessionRequired,
  corsOptions,
  whitelist_domains,
}
