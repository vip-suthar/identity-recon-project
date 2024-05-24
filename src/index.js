const express = require("express");
const SQLConnection = require("./services/db.service");
const IdentifyRoute = require("./routes/identify.route");

const app = express();
const PORT = process.env.NODE_PORT || 8000;

app.use(express.json());

app.use("/", IdentifyRoute);

app.use("*", async (_req, res) => {
  try {
    const { models } = await SQLConnection;
    const contacts = await models.Contact.findAll();
    res.send(contacts);
  } catch (error) {
    console.log("Error while fetching contacts:", error);
    res.status(500).send("Error while fetching contacts");
  }
});

app.listen(PORT, async () => {
  console.log(`listening at port: ${PORT}`);

  try {
    const { sequelize } = await SQLConnection;
    if (sequelize) {
      await sequelize.sync({ force: true });
      console.log("table sync in db successfully");
    }
  } catch (error) {
    console.log("Some error occurred while syncing tables in db:", error);
  }
});
