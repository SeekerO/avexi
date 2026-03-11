import { NextRequest, NextResponse } from 'next/server';
import { drive } from '@/lib/directory-firebase-drive/drive';
import { db } from '@/lib/directory-firebase-drive/firebase-admin';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;
        const folderId = formData.get('folderId') as string; // User's specific Drive folder

        // 1. Convert File to Stream for Drive
        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        // 2. Upload to Google Drive
        const driveResponse = await drive.files.create({
            requestBody: {
                name: file.name,
                parents: [folderId],
            },
            media: {
                mimeType: file.type,
                body: stream,
            },
            fields: 'id, webViewLink, webContentLink',
        });

        const { id, webViewLink, webContentLink } = driveResponse.data;

        // 3. Store Metadata in Firestore
        const docRef = await db.collection('exports').add({
            userId,
            fileName: file.name,
            fileSize: file.size,
            driveFileId: id,
            driveWebViewLink: webViewLink,
            driveDownloadUrl: webContentLink,
            type: file.type.includes('zip') ? 'zip' : 'image',
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ id: docRef.id, driveFileId: id }, { status: 200 });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}