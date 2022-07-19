import cron from 'node-cron';
import { Logger } from '../../../types';
import { cleanUp } from './utils';

export async function runOAuth2CleanerInInterval(logger?: Logger) {
    cron.schedule('* * * * *', async () => {
        await cleanUp(logger);
    });
}
