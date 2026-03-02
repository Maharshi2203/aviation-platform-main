import { NextResponse } from 'next/server';
import { setIngestionRunning } from '@/lib/state';

export async function POST() {
    try {
        await setIngestionRunning(false);
        return NextResponse.json({ success: true, message: 'Ingestion lock cleared successfully' });
    } catch (error) {
        console.error('[API] Clear lock error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to clear lock' },
            { status: 500 }
        );
    }
}
