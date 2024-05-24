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
                type: 'TIMESTAMP',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false
            },
            updatedAt: {
                type: 'TIMESTAMP',
                allowNull: false
            },
            deletedAt: {
                type: 'TIMESTAMP',
                allowNull: true
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
    )

    Contact.hasOne(Contact, {
        foreignKey: "linkedId"
    });

    return Contact;
}