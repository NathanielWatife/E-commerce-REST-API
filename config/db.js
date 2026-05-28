const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger.js');

let supabase = null;

const connectDB = async () => {
    if (supabase) {
        logger.debug('Using cached Supabase client');
        return supabase;
    }

    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            const errorMsg = 'Supabase Environment variables are not defined';
            logger.error('Database Configuration Error', new Error(errorMsg), {
                requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_KEY'],
                currentEnv: process.env.NODE_ENV
            });
            throw new Error(errorMsg);
        }

        logger.info('Attempting to initialize Supabase client...', {
            database: 'Supabase',
            environment: process.env.NODE_ENV,
            isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
        });

        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });
        
        logger.info('Supabase client initialized successfully');
        
        return supabase;
    } catch (error) {
        logger.error('Supabase initialization failed', error, {
            database: 'Supabase',
            environment: process.env.NODE_ENV,
            supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Not Set'
        });
        
        if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
            process.exit(1);
        }
        throw error;
    }
};

module.exports = { connectDB, getSupabase: () => supabase };