import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';
import { cleanupOldArticles } from '@/lib/cleanup';
import { isIngestionRunning, setIngestionRunning } from '@/lib/state';

async function executeCronJob() {
    if (await isIngestionRunning()) {
        console.log('[Cron] Skipping — previous run still in progress');
        return;
    }

    try {
        await setIngestionRunning(true);
        console.log(`[Cron] Pipeline starting at ${new Date().toISOString()}`);

        // Run ingestion pipeline
        const result = await runPipeline('cron');
        console.log(`[Cron] Pipeline complete — fetched: ${result.fetched}, new: ${result.newArticles}, classified: ${result.classified}`);

        // Run cleanup (delete articles older than 30 days)
        const deleted = await cleanupOldArticles(30);
        console.log(`[Cron] Cleanup complete — removed ${deleted} old articles`);

    } catch (error) {
        console.error('[Cron] Job failed:', error instanceof Error ? error.message : error);
    } finally {
        await setIngestionRunning(false);
    }
}


// GET /api/cron — Start the cron job or Get cron status
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Simple health check if no action or if specifically requested
    if (!action || action === 'status') {
        const isRunning = await isIngestionRunning();
        return NextResponse.json({
            success: true,
            scheduler: {
                isRunning,
                isProduction: process.env.NODE_ENV === 'production',
                message: 'Use ?action=run to trigger the job'
            },
        });
    }

    // Trigger cron job with ?action=run
    if (action === 'run') {
        // Strict Authorization check as requested by USER
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.warn('[Cron] Unauthorized access attempt');
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        executeCronJob(); // Run in background
        return NextResponse.json({ ok: true, message: 'Cron job initiated' });
    }

    return NextResponse.json({ ok: true });
}

// POST /api/cron — Handle manual triggers (Dashboard)
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');

    // Dashboard sends request directly, so we might need to skip secret in dev
    // but in production we MUST check it.
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    executeCronJob();
    return NextResponse.json({ success: true, message: 'Manual run triggered' });
}
