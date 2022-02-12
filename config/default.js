module.exports = {
    mysqlCxnConfig: {
        host: process.env.HOSTNAME,
        user: process.env.USERNAME,
        port: process.env.PORT,
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        caCert: process.env.CA_CERT,
    },
    authConfig: {
        users: {
            [process.env.AUTH_USERNAME]: process.env.AUTH_PASSWORD
        }
    }
};