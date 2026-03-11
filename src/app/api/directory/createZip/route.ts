import { NextRequest, NextResponse } from 'next/server';
import { drive } from '@/lib/directory-firebase-drive/drive';
import { db } from '@/lib/directory-firebase-drive/firebase-admin';
import JSZip from 'jszip';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
    try {
        const { fileIds, zipName, userId, folderId } = await req.json();
        const zip = new JSZip();

        // 1. Fetch each file from Drive and add to ZIP
        for (const fileId of fileIds) {
            const res = await drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'arraybuffer' }
            );

            // Get the original name to preserve it inside the ZIP
            const meta = await drive.files.get({ fileId, fields: 'name' });
            zip.file(meta.data.name || `file-${fileId}`, res.data as ArrayBuffer);
        }

        // 2. Generate the ZIP buffer
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        // 3. Upload the new ZIP back to Drive
        const stream = new Readable();
        stream.push(zipBuffer);
        stream.push(null);

        const driveResponse = await drive.files.create({
            requestBody: {
                name: `${zipName}.zip`,
                parents: [folderId],
            },
            media: {
                mimeType: 'application/zip',
                body: stream,
            },
            fields: 'id, webViewLink, webContentLink',
        });

        // 4. Update Firestore with the new "Export Bundle"
        const docRef = await db.collection('exports').add({
            userId,
            fileName: `${zipName}.zip`,
            fileSize: zipBuffer.length,
            driveFileId: driveResponse.data.id,
            driveWebViewLink: driveResponse.data.webViewLink,
            driveDownloadUrl: driveResponse.data.webContentLink,
            type: 'zip',
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, id: docRef.id });
    } catch (error) {
        console.error('ZIP Error:', error);
        return NextResponse.json({ error: 'Failed to create bundle' }, { status: 500 });
    }
}