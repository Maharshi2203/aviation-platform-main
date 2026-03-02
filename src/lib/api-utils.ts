import { NextRequest, NextResponse } from 'next/server';

export type ApiHandler = (req: any, ...args: any[]) => Promise<Response>;

/**
 * A wrapper for Next.js API routes to provide centralized error handling 
 * and logging, similar to Express global error middleware.
 */
export function withErrorHandler(handler: ApiHandler) {
    return async (req: Request, ...args: any[]) => {
        try {
            return await handler(req, ...args);
        } catch (error: any) {
            console.error("🔥 API ERROR:", {
                path: new URL(req.url).pathname,
                message: error.message,
                stack: error.stack
            });

            // Handle specific error types
            if (error.name === 'PrismaClientKnownRequestError') {
                return NextResponse.json({
                    success: false,
                    message: 'Database operation failed',
                    code: error.code
                }, { status: 400 });
            }

            return NextResponse.json({
                success: false,
                message: error.message || "Internal Server Error",
                // Only provide stack in development
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }, { status: 500 });
        }
    };
}
