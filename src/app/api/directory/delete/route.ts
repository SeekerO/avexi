import { NextRequest, NextResponse } from 'next/server';
import { drive } from '@/lib/directory-firebase-drive/drive';
import { db } from '@/lib/directory-firebase-drive/firebase-admin';

export async function DELETE(req: NextRequest) {
    try {
        const { id, driveFileId } = await req.json(); // docId and driveId

        // 1. Delete from Google Drive
        await drive.files.delete({ fileId: driveFileId });

        // 2. Delete from Firestore
        await db.collection('exports').doc(id).delete();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}