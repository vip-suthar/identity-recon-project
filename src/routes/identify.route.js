const router = require("express").Router();
const { Op, DataTypes } = require("sequelize");
const SQLConnection = require("../services/db.service");

const joinChains = async (ch1, ch2, { models }) => {
  /* 

    first find the primary contact for both groups(chains) and check
    if both are same, if not, then based on creation time, attach the newer one
    and all its secondary member to the newer one.
    
    */
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
          updatedAt: DataTypes.NOW,
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
          updatedAt: DataTypes.NOW,
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
  /* 
    
    while processing the input, there are various corner cases and
    we may need to traverse long chains, which is quite expensive
    so we'll use a simple approach where all secondary nodes in one contact
    group will point to a primary node (DSU with path compression)

    So here we'll first find the contact on either email or phoneNumber basis
    then if contact does not exist, then create a new primary contact
    else check if found contact contains both email and phoneNumber then
    simply return from here and prepare response, else find the other contact while
    contain the missing counterpart(email or phoneNumber) and if found, make sure both
    belong to one contact group and then prepare response and if it's counterpart is not found
    then create new contact and attach to this group.

    */
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
      // createdAt: Date.now(),
      // updatedAt: Date.now()
    });
  } else {
    await joinChains(foundContact, foundContactByParam, { models });
  }
};

const prepareResponse = async ({ email, phoneNumber, models }) => {
  /* 
    
    First we will get the row, where either email or phoneNumber matches
    and then get the root(primary) contact from that node and set primary's details
    in the response object and then get all the secondary contacts associated with that
    
    */
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

  // set is used to prevent duplicates in an ordered fashion while getting
  // the details from all the secondary contacts
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

  // finally we push set's values to their respective places in response object
  response.contact.emails.push(...emailSet.values());
  response.contact.phoneNumbers.push(...phoneNumberSet.values());

  return response;
};

router.get("/", (req, res) => {
  res.send("Hello World!");
});

router.post("/identify", async (req, res) => {
  try {
    // get the sequelize instacnce and models
    const { sequelize, models } = await SQLConnection;
    if (!sequelize) {
      return res.status(500).send("Some Error Occured");
    }

    // get email and phoneNumber from the request body,
    // and if both of them does not exist in the body,
    // return the error response
    let { email, phoneNumber } = req.body;

    if (!(email || phoneNumber)) {
      return res
        .status(500)
        .send("Atleast one of `phoneNumber` or `email` should be present");
    }

    if (email === undefined && typeof email === "undefined") email = null;
    if (phoneNumber === undefined && typeof phoneNumber === "undefined")
      phoneNumber = null;

    // email and phoneNumber input are checked with database
    // and if any changes are required in database then do it.
    await processInput({ email, phoneNumber, models });

    // prepare the returning response in desired format
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
