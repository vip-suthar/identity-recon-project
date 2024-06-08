const { Sequelize, DataTypes } = require("sequelize");

module.exports = function (sequelize) {
  const Contact = sequelize.define(
    "contact",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      phoneNumber: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      linkPrecedence: {
        type: DataTypes.ENUM("primary", "secondary"),
        allowNull: false,
        defaultValue: "primary",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: "contact",
      timestamps: true,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
      ],
    }
  );

  Contact.hasOne(Contact, {
    foreignKey: "linkedId",
  });

  return Contact;
};
