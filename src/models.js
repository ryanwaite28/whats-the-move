const Sequelize = require('sequelize');

let sequelize, db_env;
if(process.env.DATABASE_URL) {
  db_env = 'Production';
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: true
    },
    logging: false,
  });
} else {
  db_env = 'Development';
  sequelize = new Sequelize({
    password: null,
    dialect: 'sqlite',
    storage: 'database.sqlite',
    logging: false,
  });
}

const models = {};

models.Users = sequelize.define('users', {
  displayname:         { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
  username:            { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
  phone:               { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
  email:               { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
  password:            { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
  paypal:              { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
  bio:                 { type: Sequelize.STRING(250), allowNull: true, defaultValue: '' },
  icon_link:           { type: Sequelize.STRING(500), allowNull: true, defaultValue: '' },
  icon_id:             { type: Sequelize.STRING(500), allowNull: true, defaultValue: '' },
  wallpaper:           { type: Sequelize.STRING(500), allowNull: true, defaultValue: '' },
  location:            { type: Sequelize.STRING(500), allowNull: true, defaultValue: '' },
  link:                { type: Sequelize.STRING(500), allowNull: true, defaultValue: '' },
  verified:            { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  confirmed:           { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  public:              { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
  group:               { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
  date_created:        { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  uuid:                { type: Sequelize.STRING, defaultValue: Sequelize.UUIDV1 }
}, {
  freezeTableName: true,
  underscored: true,
  modelName: 'user',
  indexes: [{ unique: true, fields: ['uuid'] }]
});

sequelize.sync({ force: false })
.then(() => { console.log('Database Initialized! ENV: ' + db_env); })
.catch((error) => { console.log('Database Failed!', error); });

module.exports = {
  sequelize,
  models
}
