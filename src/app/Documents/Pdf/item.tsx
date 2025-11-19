import {
    FileUp, FileDown, FileText, FileSpreadsheet, Combine,
    Loader2, Image, FileType, X, Check, Download, Trash2,
    AlertCircle, CheckCircle
} from 'lucide-react';
import { FileItem } from './page';


const ConversionItem: React.FC<{
    files: FileItem[];
    clearAll: () => void;
    downloadFile: (file: FileItem) => void;
    removeFile: (id: string) => void;
    converting: boolean;
}> = ({ files, clearAll, downloadFile, removeFile, converting }) => {
    return (
        <div className=" rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-700">
                    Files ({files.length})
                </h3>
                <button
                    onClick={clearAll}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                </button>
            </div>
            <div className="space-y-2">
                {files.map((file) => (
                    <div
                        key={file.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-slate-200 "
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                <p className="text-xs text-slate-500">{file.size}</p>
                                {file.error && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                        <p className="text-xs text-red-500">{file.error}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {file.status === 'ready' && (
                                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">Ready</span>
                            )}
                            {file.status === 'processing' && (
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            )}
                            {file.status === 'complete' && (
                                <>
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    {file.downloadUrl && (
                                        <button
                                            onClick={() => downloadFile(file)}
                                            title={`Download ${file.outputName}`}
                                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    )}
                                </>
                            )}
                            {file.status === 'error' && (
                                <X className="w-5 h-5 text-red-500" />
                            )}
                            {file.status === 'ready' && (
                                <button
                                    onClick={() => removeFile(file.id)}
                                    className="p-1 hover:bg-red-100 rounded transition-colors"
                                    disabled={converting}
                                >
                                    <X className="w-4 h-4 text-slate-400 hover:text-red-600" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConversionItem;