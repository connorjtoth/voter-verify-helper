module.exports = {
    port: process.env.PORT || 3000,
    mysqlCxnConfig: {
        host: process.env.HOSTNAME,
        user: process.env.USERNAME,
        port: process.env.DB_PORT,
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        ssl  : {
            ca : process.env.CA_CERT,
        }
    },
    authConfig: {
        passphrase: process.env.AUTH_PASSWORD,
        cookieSignKey: process.env.COOKIE_SIGN_KEY
    }
};