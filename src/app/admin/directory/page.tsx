"use client"

import { useDirectory } from '@/lib/hooks/useDirectory';
import { Trash2, Download, FileArchive, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/app/Chat/AuthContext';

// export default function DirectoryPanel({ userId }: { userId: string }) {
//     const { files, loading, deleteFile } = useDirectory(userId);

//     if (loading) return <div className="animate-pulse p-4">Loading Assets...</div>;

//     return (
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
//             {files.map((file: any) => (
//                 <div key={file.id} className="group relative border rounded-xl p-4 bg-white hover:shadow-lg transition-all border-slate-100">
//                     <div className="flex items-center gap-3">
//                         {file.type === 'zip' ? <FileArchive className="text-blue-500" /> : <ImageIcon className="text-emerald-500" />}
//                         <div className="flex-1 overflow-hidden">
//                             <p className="font-medium text-slate-800 truncate">{file.fileName}</p>
//                             <p className="text-xs text-slate-400">{(file.fileSize / 1024 / 1024).toFixed(2)} MB</p>
//                         </div>
//                     </div>

//                     <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                         <a
//                             href={file.driveDownloadUrl}
//                             className="flex-1 bg-slate-900 text-white text-center py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
//                         >
//                             Download
//                         </a>
//                         <button
//                             onClick={() => deleteFile(file.id, file.driveFileId)}
//                             className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
//                         >
//                             <Trash2 size={18} />
//                         </button>
//                     </div>
//                 </div>
//             ))}
//         </div>
//     );
// }

export default function DirectoryPanel({ userId = "1234" }: { userId: string }) {
    const { files, loading } = useDirectory(userId);


    return (
        <div className="p-10 border-4 border-dashed border-slate-200 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">🛠 Debug Console</h2>
            <div className="space-y-2 text-sm font-mono">
                <p><strong>UserId:</strong> {userId || "❌ MISSING"}</p>
                <p><strong>Loading State:</strong> {loading ? "⏳ True (Stuck)" : "✅ False"}</p>
                <p><strong>Files Found:</strong> {files.length}</p>
            </div>

            {loading && (
                <div className="mt-6 p-4 bg-blue-50 text-blue-700 rounded-lg animate-pulse">
                    Still waiting for API response... Check terminal for Firebase errors.
                </div>
            )}
        </div>
    );
}