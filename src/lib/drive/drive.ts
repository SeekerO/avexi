// src/lib/drive.ts
// Google Drive API — server-side only
// Uses service account credentials from environment

import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

function getDriveClient(): drive_v3.Drive {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}";
    const credentials = JSON.parse(raw);

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive"],
    });

    return google.drive({ version: "v3", auth });
}

const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID!;

// ── Folder helpers ────────────────────────────────────────────────────────────

/**
 * Gets or creates a folder with the given name inside parentId.
 */
export async function getOrCreateFolder(
    name: string,
    parentId: string = ROOT_FOLDER_ID
): Promise<string> {
    const drive = getDriveClient();

    // Search for existing folder
    const res = await drive.files.list({
        q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
    }

    // Create new folder
    const folder = await drive.files.create({
        requestBody: {
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
        },
        fields: "id",
    });

    return folder.data.id!;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadResult {
    fileId: string;
    webViewLink: string;
    downloadUrl: string;
    fileSize: number;
}

/**
 * Uploads a Buffer/Blob to the specified Drive folder.
 */
export async function uploadFileToDrive(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId: string
): Promise<UploadResult> {
    const drive = getDriveClient();

    const stream = Readable.from(buffer);

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
        },
        media: {
            mimeType,
            body: stream,
        },
        fields: "id, webViewLink, size",
    });

    const fileId = res.data.id!;

    // Make the file readable by anyone with the link
    await drive.permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
    });

    return {
        fileId,
        webViewLink: res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
        fileSize: parseInt(res.data.size || "0", 10),
    };
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteFileFromDrive(fileId: string): Promise<void> {
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
}

// ── Download ──────────────────────────────────────────────────────────────────

export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
    const drive = getDriveClient();

    const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
    );

    return Buffer.from(res.data as ArrayBuffer);
}

// ── List files in a folder ────────────────────────────────────────────────────

export async function listFilesInFolder(folderId: string) {
    const drive = getDriveClient();

    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: "files(id, name, size, mimeType, webViewLink, createdTime)",
        orderBy: "createdTime desc",
    });

    return res.data.files || [];
}