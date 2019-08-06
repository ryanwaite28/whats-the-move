'use strict';

const GET = require('./methods/get');
const POST = require('./methods/post');
const PUT = require('./methods/put');
const DELETE = require('./methods/delete');

const chamber = require('../../chamber');



const router = require('express').Router();



/* --- GET Routes --- */

router.get('/', GET.welcome);
router.get('/signout', GET.sign_out);
router.get('/check_session', GET.check_session);
// router.get('/get_random_users', GET.get_random_users);
// router.get('/get_user_by_username/:username', GET.get_user_by_username);
// router.get('/get_user_reviews/:user_id', GET.get_user_reviews);
// router.get('/get_user_reviews/:user_id/:review_id', GET.get_user_reviews);



/* --- POST Routes --- */

router.post('/sign_up', POST.sign_up);
// router.post('/create_review', chamber.SessionRequired, POST.create_review);
// router.post('/submit_reset_password_request', POST.submit_reset_password_request);



/* --- PUT Routes --- */

router.put('/sign_in', PUT.sign_in);
router.put('/sign_out', PUT.sign_out);
// router.put('/change_user_password', chamber.SessionRequired, PUT.change_user_password);
// router.put('/update_icon', chamber.SessionRequired, PUT.update_icon);
// router.put('/update_info', chamber.SessionRequired, PUT.update_info);
// router.put('/update_link', chamber.SessionRequired, PUT.update_link);
// router.put('/update_bio', chamber.SessionRequired, PUT.update_bio);
// router.put('/update_email', chamber.SessionRequired, PUT.update_email);
// router.put('/submit_password_reset_code', PUT.submit_password_reset_code);



/* --- DELETE Routes --- */

// router.delete('/delete_review', chamber.CheckToken, DELETE.delete_review);



/* --- exports --- */

module.exports = {
  router
}
