import mongoose from 'mongoose';

// Advanced logger utility
export const logger = {
    info: (message, meta = {}) => {
        console.info(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
    },
    error: (message, error = null, meta = {}) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, {
            error: error?.message || error,
            stack: error?.stack,
            ...meta
        });
    },
    warn: (message, meta = {}) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
    },
    debug: (message, meta = {}) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
        }
    }
};

export const connectDB = async () => {
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
            family: 4
        };

        logger.info('Attempting to connect to Database...', {
            database: 'Raddazle',
            environment: process.env.NODE_ENV,
            mongooseVersion: mongoose.version
        });

        const connection = await mongoose.connect(`${process.env.MONGO_URI}`, connectionOptions);
        
        logger.info('Database connection established successfully', {
            database: connection.connection.name,
            host: connection.connection.host,
            port: connection.connection.port,
            readyState: connection.connection.readyState
        });

        // Connection event listeners for monitoring
        mongoose.connection.on('connected', () => {
            logger.debug('Database Connected Successfully');
        });

        mongoose.connection.on('error', (err) => {
            logger.error('Database connection error', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Database is disconnected');
        });

        return connection;

    } catch (error) {
        logger.error('Database connection failed', error, {
            database: 'Raddazle',
            environment: process.env.NODE_ENV,
            retryAttempt: false
        });
        
        // Graceful shutdown
        process.exit(1);
    }
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Gracefully shutting down database connection...');
    await mongoose.connection.close();
    logger.info('Database connection closed.');
    process.exit(0);
});
