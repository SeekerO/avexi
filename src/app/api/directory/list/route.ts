import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/directory-firebase-drive/firebase-admin'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    try {
        const snapshot = await db.collection('exports')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const files = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json(files);
    } catch (error) {
        console.error('List Error:', error);
        return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }
}