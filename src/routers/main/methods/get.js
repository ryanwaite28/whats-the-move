'use strict';

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const models = require('../../../models').models;
const chamber = require('../../../chamber');



/* --- GET Functions --- */

function welcome(request, response) {
  return response.render('pages/welcome.html', {});
}

function sign_out(request, response) {
  request.session.reset();
  return response.json({ online: false, successful: true });
}

function check_session(request, response) {
  console.log({ session: request.session, cookies: request.cookies });
  (async function() {
    try {
      if(request.session.id){
        var get_user = await models.Users.findOne({ where: { id: request.session.you.id } });
        var user = get_user.dataValues;
        delete user['password'];
        var session_id = request.session.id;
        return response.json({ online: true, session_id, user });
      }
      else {
        let auth = request.get('Authorization'); // user's token
        if(!auth) { return response.json({ error: true, online: false, message: 'No Authorization header' }); }
        let token_record = await models.Tokens.findOne({ where: { token: auth } });
        if(!token_record) { return response.json({ error: true, online: false, message: 'Auth token is invalid...' }); }
        let token = token_record.dataValues;
        if(token.ip_address !== request.ip || token.user_agent !== request.get('user-agent')) {
          return response.json({ error: true, online: false, message: 'Token used from invalid client...' });
        }
        let get_user = await models.Users.findOne({ where: { id: token.user_id } });
        let user = get_user.dataValues;
        delete user['password'];
        return response.json({ online: true, user, token: token.token });
      }
    }
    catch(e) {
      console.log('error: ', e);
      return response.json({ e, error: true });
    }
  })()
}

function get_user_by_username(request, response) {
  let { username } = request.params;
  models.Users.findOne({ where: { username } })
  .then(u => {
    let user = u.dataValues;
    delete user['password'];
    return response.json({ user });
  })
}

function get_user_reviews(request, response) {
  let { user_id, review_id } = request.params;
  models.UserRatings.findAll({
    where: (!review_id ? { user_id } : { user_id, id: { [Op.lt]: review_id } }),
    limit: 5,
    order: [["id","DESC"]]
  })
  .then(resp => {
    let promise_list = resp.map(i => {
      let data = i.get({plain: true});
      let { writer_id } = data;
      return models.Users.findOne({ where: { id: writer_id } }).then(u => {
        data.user = u.dataValues;
        return Promise.resolve(data);
      })
    })
    return Promise.all(promise_list);
  })
  .then(values => {
    return response.json({ reviews: values });
  })
}

function get_random_users(request, response) {
  models.Users.findAll({
    limit: 10,
    order: [Sequelize.fn( 'RANDOM' )],
    attributes: [
      Sequelize.fn( 'RANDOM' ),
      'id',
      'displayname',
      'username',
      'icon_link',
      'uuid',
      'createdAt',
      'updatedAt',
    ]
  })
  .then(resp => {
    let list = resp.map(i => i.get({plain: true}));
    return response.json({ users: list });
  })
}


/*  Exports  */

module.exports = {
  welcome,
  sign_out,
  check_session,
  get_user_by_username,
  get_user_reviews,
  get_random_users
}
