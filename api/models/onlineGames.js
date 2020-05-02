const { dateFields } = require('../helpers/sequelize');


module.exports = function (sequelize, DataTypes) {
  const OnlineGames = sequelize.define('onlineGames', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    data: {
      type: DataTypes.JSON,
      field: 'data',
    },
    ...dateFields,
  }, {
    paranoid: false,
    tableName: 'online_games',
  });

  return OnlineGames;
};
