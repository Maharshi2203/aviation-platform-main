import { prisma } from './db';

const INGESTION_LOCK_KEY = 'ingestion_running';

/**
 * Checks if the ingestion pipeline is currently running by checking a persistent lock in the database.
 * If the lock exists and is "true", but was updated more than 1 hour ago, it's considered stale and cleared.
 */
export async function isIngestionRunning(): Promise<boolean> {
    try {
        const state = await prisma.systemState.findUnique({
            where: { key: INGESTION_LOCK_KEY },
        });

        if (!state || state.value !== 'true') {
            return false;
        }

        // Check if the lock is stale (older than 1 hour)
        const staleThreshold = 1 * 60 * 60 * 1000; // 1 hour
        const now = Date.now();
        const updatedAt = new Date(state.updatedAt).getTime();

        if (now - updatedAt > staleThreshold) {
            console.log('[Lock] Stale ingestion lock detected. Clearing...');
            await setIngestionRunning(false);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Lock] Error checking ingestion lock:', error);
        return false;
    }
}

/**
 * Sets the ingestion running state in the database.
 */
export async function setIngestionRunning(running: boolean): Promise<void> {
    try {
        await prisma.systemState.upsert({
            where: { key: INGESTION_LOCK_KEY },
            update: {
                value: running ? 'true' : 'false',
                updatedAt: new Date(),
            },
            create: {
                key: INGESTION_LOCK_KEY,
                value: running ? 'true' : 'false',
            },
        });
        console.log(`[Lock] Ingestion lock set to: ${running}`);
    } catch (error) {
        console.error('[Lock] Error setting ingestion lock:', error);
    }
}
