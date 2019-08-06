'use strict';

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const models = require('../../../models').models;
const chamber = require('../../../chamber');



/* --- DELETE Functions --- */

function delete_review(request, response) {
  let { review_id } = request.body;
  if(!chamber.validateInteger(review_id)) {
    return response.json({ error: true, message: '"review_id" is required; must be integer/number' });
  }
  models.UserRatings.destroy({where: {id: review_id, writer_id: response.locals.you.id}})
  .then(res => {
    return response.json({ res, message: 'Review Deleted!' });
  })
  .catch(error => {
    console.log('error', error);
    return response.json({ error: true, message: 'Could not delete review...' });
  });
}



/* --- Exports --- */

module.exports = {
  delete_review
}
