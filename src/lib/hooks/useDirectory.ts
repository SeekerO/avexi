import { useState, useEffect, useCallback } from 'react';

export function useDirectory(userId: string) {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFiles = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/directory/list?userId=${userId}`);
            const data = await res.json();
            setFiles(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch files:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const deleteFile = async (id: string, driveFileId: string) => {
        // 1. Optimistic UI update (remove immediately from view)
        const previousFiles = [...files];
        setFiles((prev) => prev.filter((file) => file.id !== id));

        try {
            const res = await fetch('/api/directory/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, driveFileId }),
            });

            if (!res.ok) throw new Error('Delete failed');
        } catch (error) {
            // 2. Rollback if the server fails
            console.error(error);
            setFiles(previousFiles);
            alert('Could not delete file. Please try again.');
        }
    };

    const createZip = async (fileIds: string[], zipName: string, folderId: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/directory/createZip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileIds, zipName, userId, folderId }),
            });
            if (res.ok) await fetchFiles();
        } catch (error) {
            console.error('ZIP creation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    return { files, loading, createZip, deleteFile, refresh: fetchFiles };
}