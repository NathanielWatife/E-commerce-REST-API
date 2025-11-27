const mongoose = require('mongoose');
const logger = require('../utils/logger.js');

let cachedConnection = null;

const connectDB = async () => {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        logger.debug('Using cached database connection');
        return cachedConnection;
    }

    try {
        if (!process.env.MONGO_URI) {
            const errorMsg = 'Database Environment variable is not defined';
            logger.error('Database Configuration Error', new Error(errorMsg), {
                requiredEnvVar: 'MONGO_URI',
                currentEnv: process.env.NODE_ENV
            });
            throw new Error(errorMsg);
        }

        const connectionOptions = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            bufferCommands: false,
            ...(process.env.NODE_ENV === 'production' && {
                retryWrites: true,
                w: 'majority'
            })
        };

        logger.info('Attempting to connect to Database...', {
            database: 'Raddazle',
            environment: process.env.NODE_ENV,
            mongooseVersion: mongoose.version,
            isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
        });

        const connection = await mongoose.connect(`${process.env.MONGO_URI}`, connectionOptions);
        
        cachedConnection = connection;
        
        logger.info('Database connection established successfully', {
            database: connection.connection.name,
            host: connection.connection.host,
            port: connection.connection.port,
            readyState: connection.connection.readyState
        });
        
        mongoose.connection.on('connected', () => {
            logger.debug('Database Connected Successfully');
        });

        mongoose.connection.on('error', (err) => {
            logger.error('Database connection error', err);
            cachedConnection = null;
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Database is disconnected');
            cachedConnection = null;
        });

        return connection;

    } catch (error) {
        logger.error('Database connection failed', error, {
            database: 'Raddazle',
            environment: process.env.NODE_ENV,
            mongoUri: process.env.MONGO_URI ? 'Set' : 'Not Set'
        });
        cachedConnection = null;
        
        if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
            process.exit(1);
        }
        throw error;
    }
};


if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT. Gracefully shutting down database connection...');
        await mongoose.connection.close();
        logger.info('Database connection closed.');
        process.exit(0);
    });
}

module.exports = { connectDB };