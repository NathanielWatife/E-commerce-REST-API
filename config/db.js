const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('../utils/logger.js');

let connectionPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        logger.debug('Using existing MongoDB connection');
        return mongoose.connection;
    }
    if (connectionPromise) {
        logger.debug('Awaiting in-flight MongoDB connection');
        await connectionPromise;
        return mongoose.connection;
    }
    try {
        if (!process.env.MONGO_URI) {
            const errorMsg = 'MONGO_URI environment variable is not defined';
            logger.error('Database Configuration Error', new Error(errorMsg), {
                requiredEnvVars: ['MONGO_URI'],
                currentEnv: process.env.NODE_ENV
            });
            throw new Error(errorMsg);
        }
        logger.info('Attempting to connect to MongoDB...', {
            database: 'MongoDB',
            environment: process.env.NODE_ENV,
            isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
        });

        // If using mongodb+srv URIs, ensure SRV DNS resolution can succeed.
        // Some networks block DNS or return ECONNREFUSED; set public DNS servers as a fallback.
        try {
            if (process.env.MONGO_URI && process.env.MONGO_URI.startsWith('mongodb+srv://')) {
                dns.setServers(['8.8.8.8', '1.1.1.1']);
                logger.debug('Set custom DNS servers for SRV resolution', { servers: dns.getServers() });
            }
        } catch (dnsErr) {
            logger.warn('Could not set custom DNS servers', dnsErr && dnsErr.message ? dnsErr.message : dnsErr);
        }

        // Attempt standard connect first (no deprecated options)
        connectionPromise = mongoose.connect(process.env.MONGO_URI);
        await connectionPromise;
        connectionPromise = null;
        logger.info('MongoDB connected successfully');
        
        return mongoose.connection;
    } catch (error) {
        connectionPromise = null;
        logger.error('MongoDB connection failed', error, {
            database: 'MongoDB',
            environment: process.env.NODE_ENV
        });

        // If the URI used SRV and the error looks like an SRV/DNS failure,
        // attempt to resolve SRV records and build a mongodb:// fallback.
        try {
            const uri = process.env.MONGO_URI || '';
            if (uri.startsWith('mongodb+srv://')) {
                logger.info('Attempting SRV -> standard mongodb:// fallback');
                // parse the mongodb+srv URI minimally
                const withoutPrefix = uri.replace('mongodb+srv://', '');
                // split auth@hosts/db?opts
                const atIndex = withoutPrefix.indexOf('@');
                let authPart = null;
                let rest = withoutPrefix;
                if (atIndex !== -1) {
                    authPart = withoutPrefix.slice(0, atIndex);
                    rest = withoutPrefix.slice(atIndex + 1);
                }

                const slashIndex = rest.indexOf('/');
                const hostsPart = slashIndex === -1 ? rest : rest.slice(0, slashIndex);
                const dbAndQuery = slashIndex === -1 ? '' : rest.slice(slashIndex + 1); // may include db and ?query
                const dbName = dbAndQuery.split('?')[0] || '';
                const query = dbAndQuery.includes('?') ? dbAndQuery.split('?').slice(1).join('?') : '';

                // Resolve SRV records for the cluster host (hostsPart is usually the cluster hostname)
                const srvName = `_mongodb._tcp.${hostsPart}`;
                logger.debug('Resolving SRV records for', { srvName });
                const srvRecords = await dns.promises.resolveSrv(srvName);
                const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(',');

                // Reconstruct auth segment
                let authSegment = '';
                if (authPart) {
                    authSegment = `${authPart}@`;
                }

                const fallbackUri = `mongodb://${authSegment}${hosts}/${dbName}${query ? `?${query}` : ''}`;
                logger.info('Connecting using fallback URI (mongodb://) — hiding credentials in logs');

                connectionPromise = mongoose.connect(fallbackUri);
                await connectionPromise;
                connectionPromise = null;
                logger.info('MongoDB connected successfully via fallback mongodb:// URI');
                return mongoose.connection;
            }
        } catch (fallbackErr) {
            logger.error('Fallback mongodb:// connection failed', fallbackErr);
        }

        if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
            process.exit(1);
        }
        throw error;
    }
};

module.exports = { connectDB };