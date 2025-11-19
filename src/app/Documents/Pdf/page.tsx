"use client"

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    FileUp, FileDown, FileText, FileSpreadsheet, Combine,
    Loader2, Image, FileType, Download, CheckCircle
} from 'lucide-react';
import { wordToPDF, pdfToWord, excelToPDF, pdfToExcel, htmlToPDF, combinePDFs, imagesToPDF } from './conversion_function';
import ConversionItem from './item';

// --- Type Definitions ---
type ConversionMode =
    'pdf-to-word' | 'pdf-to-excel' | 'word-to-pdf' | 'excel-to-pdf' |
    'combine-pdf' | 'image-to-pdf' | 'html-to-pdf';

export interface FileItem {
    id: string;
    file: File;
    name: string;
    size: string;
    status: 'ready' | 'processing' | 'complete' | 'error';
    downloadUrl?: string;
    outputName?: string;
    error?: string;
}

export interface ModeConfig {
    id: ConversionMode;
    label: string;
    icon: React.ElementType;
    accept: string;
    outputExt: string;
    multiple?: boolean;
}



// --- Conversion Item Component ---


// --- Main Component ---
const PDFConverter: React.FC = () => {
    const [mode, setMode] = useState<ConversionMode>('word-to-pdf');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [converting, setConverting] = useState(false);
    const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        script.onload = () => {
            if ((window as any).pdfjsLib) {
                (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                setPdfJsLoaded(true);
            }
        };
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const allModes: ModeConfig[] = useMemo(() => [
        { id: 'word-to-pdf', label: 'Word to PDF', icon: FileText, accept: '.doc,.docx', outputExt: '.pdf' },
        { id: 'pdf-to-word', label: 'PDF to Word', icon: FileDown, accept: '.pdf', outputExt: '.txt' },
        { id: 'excel-to-pdf', label: 'Excel to PDF', icon: FileSpreadsheet, accept: '.xls,.xlsx,.csv', outputExt: '.pdf' },
        { id: 'pdf-to-excel', label: 'PDF to Excel', icon: FileUp, accept: '.pdf', outputExt: '.xlsx' },
        { id: 'image-to-pdf', label: 'Image to PDF', icon: Image, accept: 'image/jpeg,image/png', outputExt: '.pdf', multiple: true },
        { id: 'html-to-pdf', label: 'HTML to PDF', icon: FileType, accept: '.html', outputExt: '.pdf' },
        { id: 'combine-pdf', label: 'Combine PDFs', icon: Combine, accept: '.pdf', outputExt: '.pdf', multiple: true },
    ], []);

    const currentMode = allModes.find(m => m.id === mode);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const generateOutputName = (inputName: string, newExtension: string): string => {
        const baseName = inputName.replace(/\.[^/.]+$/, '');
        return `${baseName}${newExtension}`;
    };

    const processFiles = (selectedFiles: File[]) => {
        if (selectedFiles.length === 0) return;

        const newFiles: FileItem[] = selectedFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            size: formatFileSize(file.size),
            status: 'ready'
        }));

        if (currentMode?.multiple) {
            setFiles(prev => [...prev, ...newFiles]);
        } else {
            setFiles(newFiles.slice(0, 1));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        processFiles(selectedFiles);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        processFiles(droppedFiles);
    };

    const removeFile = (id: string) => {
        setFiles(files.filter(f => f.id !== id));
    };

    const clearAll = () => {
        files.forEach(f => {
            if (f.downloadUrl) URL.revokeObjectURL(f.downloadUrl);
        });
        setFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const downloadFile = (file: FileItem) => {
        if (!file.downloadUrl || !file.outputName) return;
        const a = document.createElement('a');
        a.href = file.downloadUrl;
        a.download = file.outputName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const downloadAllFiles = () => {
        files.forEach(file => {
            if (file.status === 'complete' && file.downloadUrl) {
                downloadFile(file);
            }
        });
    };

    const handleConvert = async () => {
        if (files.length === 0 || !currentMode) return;

        if ((mode === 'pdf-to-word' || mode === 'pdf-to-excel') && !pdfJsLoaded) {
            alert('PDF text extraction library is still loading. Please wait a moment and try again.');
            return;
        }

        setConverting(true);

        if (currentMode.multiple) {
            setFiles(files.map(f => ({ ...f, status: 'processing' })));
            try {
                let blob: Blob;
                if (mode === 'combine-pdf') {
                    blob = await combinePDFs(files);
                } else {
                    blob = await imagesToPDF(files);
                }

                const url = URL.createObjectURL(blob);
                const outputName = mode === 'combine-pdf' ? 'combined.pdf' : 'images.pdf';

                setFiles([{
                    id: 'combined-result',
                    file: new File([blob], outputName),
                    name: 'Combined File',
                    size: formatFileSize(blob.size),
                    status: 'complete',
                    downloadUrl: url,
                    outputName: outputName
                }]);
            } catch (error) {
                console.error('Conversion error:', error);
                setFiles(files.map(f => ({
                    ...f,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Conversion failed'
                })));
            }
        } else {
            const updatedFiles = [...files];
            for (let i = 0; i < updatedFiles.length; i++) {
                updatedFiles[i] = { ...updatedFiles[i], status: 'processing' };
                setFiles([...updatedFiles]);

                try {
                    let blob: Blob;

                    switch (mode) {
                        case 'word-to-pdf':
                            blob = await wordToPDF(updatedFiles[i]);
                            break;
                        case 'pdf-to-word':
                            blob = await pdfToWord(updatedFiles[i]);
                            break;
                        case 'excel-to-pdf':
                            blob = await excelToPDF(updatedFiles[i]);
                            break;
                        case 'pdf-to-excel':
                            blob = await pdfToExcel(updatedFiles[i]);
                            break;
                        case 'html-to-pdf':
                            blob = await htmlToPDF(updatedFiles[i]);
                            break;
                        default:
                            throw new Error('Invalid conversion mode');
                    }

                    const url = URL.createObjectURL(blob);
                    const outputName = generateOutputName(updatedFiles[i].name, currentMode.outputExt);

                    updatedFiles[i] = {
                        ...updatedFiles[i],
                        status: 'complete',
                        downloadUrl: url,
                        outputName: outputName
                    };
                } catch (error: any) {
                    console.error('Conversion error:', error);
                    updatedFiles[i] = {
                        ...updatedFiles[i],
                        status: 'error',
                        error: error.message || 'Conversion failed'
                    };
                }
                setFiles([...updatedFiles]);
            }
        }

        setConverting(false);
    };

    const hasCompletedFiles = files.some(f => f.status === 'complete');

    return (
        <div className="min-h-screen w-screen overflow-y-auto bg-gradient-to-br p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">File Converter Suite</h1>
                    <p className="text-slate-600">Convert files securely in your browser</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <div className={`w-2 h-2 rounded-full ${pdfJsLoaded ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                        <span className="text-sm text-slate-500">
                            100% Client-Side • Your files never leave your device
                            {!pdfJsLoaded && ' • Loading PDF extraction...'}
                        </span>
                    </div>
                </div>

                <div className=" rounded-2xl shadow-lg p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Select Conversion Type</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {allModes.map(m => {
                            const Icon = m.icon;
                            const isActive = mode === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => {
                                        setMode(m.id);
                                        clearAll();
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center ${isActive
                                        ? 'border-blue-500 bg-blue-90 shadow-md'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-800'
                                        }`}
                                >
                                    <Icon className={`w-8 h-8 mb-2 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <p className={`text-sm font-medium text-center ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                                        {m.label}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className=" rounded-2xl shadow-lg p-6 mb-6">
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-300 hover:border-slate-400'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple={currentMode?.multiple === true}
                            accept={currentMode?.accept}
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <FileUp className={`w-12 h-12 mx-auto mb-3 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
                            <p className="text-lg font-medium text-slate-700 mb-1">
                                {currentMode?.multiple ? 'Choose or drop files' : 'Choose or drop file to convert'}
                            </p>
                            <p className="text-sm text-slate-500">
                                {currentMode?.multiple ? 'You can select multiple files' : 'Click to browse or drag & drop'}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                                Accepted: {currentMode?.accept}
                            </p>
                        </label>
                    </div>
                </div>

                {files.length > 0 && (
                    <ConversionItem
                        files={files}
                        clearAll={clearAll}
                        downloadFile={downloadFile}
                        removeFile={removeFile}
                        converting={converting}
                    />
                )}

                {files.length > 0 && files.every(f => f.status === 'ready') && (
                    <div className=" rounded-2xl shadow-lg p-6">
                        <button
                            onClick={handleConvert}
                            disabled={converting}
                            className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${converting
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg'
                                }`}
                        >
                            {converting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Converting...
                                </>
                            ) : (
                                <>
                                    <FileDown className="w-5 h-5" />
                                    Convert {files.length} {files.length === 1 ? 'File' : 'Files'}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {hasCompletedFiles && (
                    <div className=" border border-green-200 rounded-2xl shadow-lg p-6 mt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <div>
                                    <h3 className="text-lg font-semibold text-green-600">Conversion Complete!</h3>
                                    <p className="text-sm text-green-600">Your files are ready to download</p>
                                </div>
                            </div>
                            <button
                                onClick={downloadAllFiles}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Download All
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center text-sm text-slate-500">
                    <p>Powered by pdf-lib, jsPDF, PDF.js, SheetJS & Mammoth • Secure & Private</p>
                </div>
            </div>
        </div>
    );
};

export default PDFConverter;