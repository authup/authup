import cron from 'node-cron';
import { cleanUp } from './utils';

export async function runOAuth2CleanerInInterval() {
    cron.schedule('* * * * *', async () => {
        await cleanUp(true);
    });
}
