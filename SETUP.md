# How to setup an ARK Pay Tip bot like ArkTippr?

## Database

It's essential to setup your database on a separate server/cluster than your platform listeners.
The database should be configured to be **only** accessible by your platform listener servers and
optional management environment. Remember that every seed in your setup will be stored in
this database, so make sure you have a secure back mechanism in place including the option
to replay every DB transaction.

-   ArkTippr has been tested with PostgreSQL 10
-   Make sure you setup snapshots
-   Limit access to only your platform listeners and optional management environment (firewall)
-   All user wallet seeds will be stored in an encrypted format, to prevent them being abused
    in case your database, or backup, ever gets compromised.

**Do make absolute sure that your database and your platform listeners are separate infrastructures!
In case one of those infrastructures is ever compromised your user's wallets are safe; in case
both get compromised your user's funds are at risk!**

Once you have configured your database server/cluster you can load the configuration from
the [database.sql](database.sql) file.

## Configuration File

The system is very configurable with a number of setting in a JSON file.
See [example.pay-config.json](example.pay-config.json). The `pay-config.json` file resides in
the `~/.config/ark-pay-nodejs/` directory on your platform listener servers.

To start it's easiest to copy the `example.pay-config.json` file into the config directory and change it's setting.

`cp -rp ./example.pay-config.json ~/.config/ark-pay-nodejs/pay-config.json`
