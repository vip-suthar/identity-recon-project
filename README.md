# To run this project

clone the github repo [here](https://github.com/vip-suthar/bitespeed-task) and run locally by installing the required dependency, run the following command at the root of the project

    > npm install
    > npm start

- change the `.env.example` filename to `.env` and put the required values there.

> P.S - To use locally make sure to install mysql server and put the credentials in the `.env` at the root of the project.

## To use the api

- URL :- [https://bitespeed-task.vercel.app/identify](https://bitespeed-task.vercel.app/identify)
- Type :- POST
- Body:

      {
        "email"?: string | null,
        "phoneNumber"?: string | null
      }
