import cron from 'node-cron';
import { cleanUp } from './utils';
import { Logger } from '../../../config';

export async function runOAuth2CleanerInInterval(logger?: Logger) {
    cron.schedule('* * * * *', async () => {
        await cleanUp(logger);
    });
}
