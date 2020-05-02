const Sequelize = require('sequelize');
const fs = require('fs');

const { DATABASE_URL } = require('./../../config.js');

const dbConnectionString = DATABASE_URL;
try {
  const sequelize = new Sequelize(dbConnectionString, { logging: false, ssl: true, pool: { acquire: 2000 } });
  const models = fs.readdirSync(__dirname)
    .reduce((all, fileName) => {
      if (fileName === 'index.js') {
        return all;
      }
      const modelName = fileName.split('.')[0];
      return {
        ...all,
        [modelName]: sequelize.import(`${__dirname}/${fileName}`),
      };
    }, {});

  Object.keys(models).forEach((modelName) => {
    if (models[modelName].associate) {
      models[modelName].associate(models);
    }
  });
  module.exports = {
    NOW: Sequelize.NOW,
    sequelize,
    Sequelize,
    ...models,
  };
} catch (e) {
  module.exports = {
    NOW: Sequelize.NOW,
    Sequelize,
  };
}
