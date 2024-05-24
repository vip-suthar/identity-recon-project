const router = require("express").Router();
const { Sequelize, Op } = require("sequelize");
const sql_conn = require("../services/db.service");

const joinChains = async (ch1, ch2, { models }) => {
  let primaryIdCh1 = ch1.linkedId || ch1.id,
    primaryIdCh2 = ch2.linkedId || ch2.id;

  if (primaryIdCh1 === primaryIdCh2) return;
  else {
    let primaryNodeCh1 = ch1,
      primaryNodeCh2 = ch2;

    if (primaryNodeCh1.linkPrecedence === "secondary") {
      primaryNodeCh1 = await models.Contact.findByPk(primaryIdCh1, {
        raw: true,
      });
    }

    if (primaryNodeCh2.linkPrecedence === "secondary") {
      primaryNodeCh2 = await models.Contact.findByPk(primaryIdCh2, {
        raw: true,
      });
    }

    if (primaryNodeCh1.createdAt < primaryNodeCh2.createdAt) {
      await models.Contact.update(
        {
          linkedId: primaryIdCh1,
          linkPrecedence: "secondary",
          updatedAt: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            [Op.or]: [{ id: primaryIdCh2 }, { linkedId: primaryIdCh2 }],
          },
        }
      );
    } else {
      await models.Contact.update(
        {
          linkedId: primaryIdCh2,
          linkPrecedence: "secondary",
          updatedAt: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            [Op.or]: [{ id: primaryIdCh1 }, { linkedId: primaryIdCh1 }],
          },
        }
      );
    }
  }
};

const processInput = async ({ email, phoneNumber, models }) => {
  let foundContact = await models.Contact.findOne({
    where: { [Op.or]: [{ email }, { phoneNumber }] },
    raw: true,
  });

  if (!foundContact) {
    await models.Contact.create({
      email,
      phoneNumber,
    });
    return;
  }

  let searchParam = {};

  if (
    foundContact.email === email &&
    foundContact.phoneNumber === phoneNumber
  ) {
    return;
  } else if (foundContact.email === email) {
    if (!phoneNumber) return;
    searchParam.phoneNumber = phoneNumber;
  } else if (foundContact.phoneNumber === phoneNumber) {
    if (!email) return;
    searchParam.email = email;
  }

  let foundContactByParam = await models.Contact.findOne({
    where: searchParam,
    raw: true,
  });

  if (!foundContactByParam) {
    await models.Contact.create({
      email,
      phoneNumber,
      linkedId: foundContact.linkedId || foundContact.id,
      linkPrecedence: "secondary",
    });
  } else {
    await joinChains(foundContact, foundContactByParam, { models });
  }
};

const prepareResponse = async ({ email, phoneNumber, models }) => {
  let primaryContact = await models.Contact.findOne({
    where: { [Op.or]: [{ email }, { phoneNumber }] },
    raw: true,
  });

  if (primaryContact.linkPrecedence !== "primary") {
    primaryContact = await models.Contact.findByPk(primaryContact.linkedId, {
      raw: true,
    });
  }

  const response = {
    contact: {
      primaryContatctId: primaryContact.id,
      emails: [],
      phoneNumbers: [],
      secondaryContactIds: [],
    },
  };

  const emailSet = new Set();
  const phoneNumberSet = new Set();
  if (primaryContact.email) emailSet.add(primaryContact.email);
  if (primaryContact.phoneNumber)
    phoneNumberSet.add(primaryContact.phoneNumber);

  let secondaryContacts = await models.Contact.findAll({
    where: { linkedId: primaryContact.id },
    raw: true,
  });

  secondaryContacts.forEach((contact) => {
    if (contact.email) emailSet.add(contact.email);
    if (contact.phoneNumber) phoneNumberSet.add(contact.phoneNumber);
    response.contact.secondaryContactIds.push(contact.id);
  });

  response.contact.emails.push(...emailSet.values());
  response.contact.phoneNumbers.push(...phoneNumberSet.values());

  return response;
};

router.post("/identify", async (req, res) => {
  try {
    const { sequelize, models } = await sql_conn;
    if (!sequelize) {
      return res.status(500).send("Some Error Occured");
    }

    let { email, phoneNumber } = req.body;

    if (!(email || phoneNumber)) {
      return res
        .status(500)
        .send("Atleast one of `phoneNumber` or `email` should be present");
    }

    if (email === undefined && typeof email === "undefined") email = null;
    if (phoneNumber === undefined && typeof phoneNumber === "undefined")
      phoneNumber = null;

    await processInput({ email, phoneNumber, models });

    const response = await prepareResponse({
      email,
      phoneNumber,
      models,
    });
    res.send(response);
  } catch (error) {
    console.log("Some Error occured", error);
    res.status(500).send("Some Error Occured");
  }
});

module.exports = router;
