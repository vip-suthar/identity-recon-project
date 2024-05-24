const { Sequelize } = require("sequelize");
const { dbConfig } = require("../config");

const Contact = require("../models/contact.model");

const SQLConnection = {
  sequelize: null,
  models: {},
};

module.exports = (async function () {
  if (SQLConnection.sequelize) return { ...SQLConnection };

  const sequelize = new Sequelize({
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    dialect: dbConfig.dialect,
    pool: dbConfig.pool,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    SQLConnection.sequelize = sequelize; 

    SQLConnection.models.Contact = Contact(sequelize);
  } catch (error) {
    console.error("Unable to connect to the database:", error);

    SQLConnection.sequelize = null;
  }

  return SQLConnection;
})();
