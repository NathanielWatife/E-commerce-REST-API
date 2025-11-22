const mongoose = require('mongoose');
const logger = require('../utils/logger.js');

// Cache the database connection for serverless
let cachedConnection = null;

const connectDB = async () => {
    // Return existing connection if available (serverless optimization)
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
            bufferCommands: false, // Disable buffering in serverless
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
        
        // Cache the connection for reuse in serverless
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
            cachedConnection = null; // Clear cache on error
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Database is disconnected');
            cachedConnection = null; // Clear cache on disconnect
        });

        return connection;

    } catch (error) {
        logger.error('Database connection failed', error, {
            database: 'Raddazle',
            environment: process.env.NODE_ENV,
            mongoUri: process.env.MONGO_URI ? 'Set' : 'Not Set'
        });
        cachedConnection = null;
        
        // Don't exit in serverless environments
        if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
            process.exit(1);
        }
        throw error;
    }
};


// Only set up SIGINT handler in non-serverless environments
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT. Gracefully shutting down database connection...');
        await mongoose.connection.close();
        logger.info('Database connection closed.');
        process.exit(0);
    });
}

module.exports = { connectDB };