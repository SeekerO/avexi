// components/SheetViewer.tsx
'use client'; // Required for client-side components in Next.js App Router

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchSheetData } from './fetcherExcel'; // Adjust the path as necessary
import * as XLSX from 'xlsx'; // Import the xlsx library
import { DateTextConvertToReadable } from "@/lib/util/convertExcelTimestamp"
// Type definition for a row in the sheet
type SheetRow = Record<string, string | number | boolean | null>;

// Props for the SheetViewer component
interface SheetViewerProps {
    sheetId: string | null;
    sheetName: string;
}

const SheetViewer: React.FC<SheetViewerProps> = ({ sheetId: propSheetId, sheetName: propSheetName }) => {
    // State for raw fetched data
    const [data, setData] = useState<SheetRow[] | null>(null);
    // State for data that can be edited by the user (a copy of 'data')
    const [editedData, setEditedData] = useState<SheetRow[] | null>(data ? JSON.parse(JSON.stringify(data)) : null);
    // State for loading status
    const [loading, setLoading] = useState<boolean>(false);
    // State for error messages
    const [error, setError] = useState<string | null>(null);

    // State for search functionality
    const [searchTerm, setSearchTerm] = useState<string>('');
    // State for visible columns (initially all columns)
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    // State for sorting
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // State for inline editing
    const [editingCell, setEditingCell] = useState<{
        rowIndex: number;
        colName: string;
    } | null>(null);
    const [editedValue, setEditedValue] = useState<string | number | boolean | null>('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 50; // Fixed number of items per page

    // State for modal to display full URL text (if not opening in new tab)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [modalContent, setModalContent] = useState<string>(''); // To store the original URL
    const [modalEmbedUrl, setModalEmbedUrl] = useState<string>(""); // New state for embeddable URL

    // States for local storage integration
    const [currentSheetId, setCurrentSheetId] = useState<string | null>(propSheetId);
    const [currentSheetName, setCurrentSheetName] = useState<string>(propSheetName);
    const [saveToLocalStorage, setSaveToLocalStorage] = useState<boolean>(false); // New state for user control

    // Helper function to convert Google Drive view URL to embed URL
    const getGoogleDriveEmbedUrl = useCallback((url: string): string | null => {
        try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/');
            const docIdIndex = pathSegments.indexOf('d');

            if (docIdIndex !== -1 && docIdIndex + 1 < pathSegments.length) {
                const docId = pathSegments[docIdIndex + 1];

                if (urlObj.hostname === 'docs.google.com') {
                    if (urlObj.pathname.includes('/document/')) {
                        return `https://docs.google.com/document/d/${docId}/preview`;
                    } else if (urlObj.pathname.includes('/spreadsheets/')) {
                        return `https://docs.google.com/spreadsheets/d/${docId}/htmlembed`;
                    } else if (urlObj.pathname.includes('/presentation/')) {
                        return `https://docs.google.com/presentation/d/${docId}/embed`;
                    }
                } else if (urlObj.hostname === 'drive.google.com' && urlObj.pathname.includes('/file/d/')) {
                    // For general Google Drive files (PDFs, images, videos directly uploaded to Drive),
                    // embedding is generally blocked by X-Frame-Options.
                    // We return null to indicate it's not directly embeddable this way.
                    return null;
                }
            }
        } catch (e) {
            console.error("Invalid URL for embed check:", url, e);
        }
        return null;
    }, []);

    // Effect hook to load from local storage on initial mount
    useEffect(() => {
        if (typeof window !== 'undefined') { // Ensure localStorage is available
            const savedSheetId = localStorage.getItem('sheetViewerSheetId');
            const savedSheetName = localStorage.getItem('sheetViewerSheetName');
            const savedSavePreference = localStorage.getItem('sheetViewerSavePreference');

            if (savedSheetId && savedSheetName && (!propSheetId && !propSheetName)) {
                setCurrentSheetId(savedSheetId);
                setCurrentSheetName(savedSheetName);
            }

            if (savedSavePreference === 'true') {
                setSaveToLocalStorage(true);
            }
        }
    }, [propSheetId, propSheetName]); // Depend on props to not override them if they are provided initially

    // Effect hook to fetch data when sheetId or sheetName changes (internal state)
    useEffect(() => {
        const fetchData = async () => {
            const sheetIdToFetch = propSheetId || currentSheetId;
            const sheetNameToFetch = propSheetName || currentSheetName;

            if (!sheetIdToFetch || !sheetNameToFetch) {
                setData(null);
                setEditedData(null);
                setVisibleColumns([]);
                setError(null);
                setLoading(false);
                setCurrentPage(1); // Reset page on new sheet
                return;
            }

            setLoading(true);
            setError(null);
            setData(null); // Clear previous data
            setEditedData(null); // Clear previous edited data
            setCurrentPage(1); // Reset to first page on new fetch

            try {
                const fetchedData = await fetchSheetData(sheetIdToFetch, sheetNameToFetch);
                setData(fetchedData);
                setEditedData(JSON.parse(JSON.stringify(fetchedData))); // Create a deep copy for editing
                // Set all columns visible by default
                if (fetchedData.length > 0) {
                    setVisibleColumns(Object.keys(fetchedData[0]));
                } else {
                    setVisibleColumns([]);
                }

                // Save to local storage if preference is enabled
                if (saveToLocalStorage && typeof window !== 'undefined') {
                    localStorage.setItem('sheetViewerSheetId', sheetIdToFetch);
                    localStorage.setItem('sheetViewerSheetName', sheetNameToFetch);
                }

            } catch (err: any) {
                console.error("Error fetching data in SheetViewer:", err);
                setError(err.message || 'Failed to load data from Google Sheet.');
                setData(null);
                setEditedData(null);
                setVisibleColumns([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [propSheetId, propSheetName, currentSheetId, currentSheetName, saveToLocalStorage]); // Re-fetch when prop/internal sheetId/sheetName changes or save preference changes

    // Memoized list of all unique headers from the fetched data
    const allHeaders = useMemo(() => {
        if (!data || data.length === 0) return [];
        return Array.from(new Set(data.flatMap(row => Object.keys(row))));
    }, [data]);

    // Filter and sort the data based on user input
    const processedDataForPagination = useMemo(() => {
        if (!editedData) return null;

        let currentData = [...editedData];

        // 1. Search/Filter
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            currentData = currentData.filter(row =>
                Object.values(row).some(value =>
                    String(value).toLowerCase().includes(lowerCaseSearchTerm)
                )
            );
        }

        // 2. Sort
        if (sortColumn) {
            currentData.sort((a, b) => {
                const valA = String(a[sortColumn] || '').toLowerCase();
                const valB = String(b[sortColumn] || '').toLowerCase();

                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return currentData;
    }, [editedData, searchTerm, sortColumn, sortDirection]);

    // Calculate total pages
    const totalPages = useMemo(() => {
        if (!processedDataForPagination) return 0;
        return Math.ceil(processedDataForPagination.length / itemsPerPage);
    }, [processedDataForPagination, itemsPerPage]);

    // Get data for the current page
    const displayedData = useMemo(() => {
        if (!processedDataForPagination) return null;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return processedDataForPagination.slice(startIndex, endIndex);
    }, [processedDataForPagination, currentPage, itemsPerPage]);

    // Handler for column visibility toggle
    const handleColumnToggle = (columnName: string) => {
        setVisibleColumns(prevVisibleColumns => {
            if (prevVisibleColumns.includes(columnName)) {
                return prevVisibleColumns.filter(col => col !== columnName);
            } else {
                return [...prevVisibleColumns, columnName];
            }
        });
    };

    // Handler for sorting
    const handleSort = (columnName: string) => {
        if (sortColumn === columnName) {
            setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(columnName);
            setSortDirection('asc');
        }
        setCurrentPage(1); // Reset to first page on new sort
    };

    // Inline editing: start editing on click
    const handleCellClick = useCallback((rowIndex: number, colName: string, currentValue: string | number | boolean | null) => {
        // Adjust rowIndex to get the correct index in the full processedDataForPagination array
        setEditingCell({ rowIndex: rowIndex + (currentPage - 1) * itemsPerPage, colName });
        setEditedValue(currentValue);
    }, [currentPage, itemsPerPage]);

    // Inline editing: handle input change
    const handleEditChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedValue(e.target.value);
    }, []);

    // Inline editing: save changes on blur or Enter key
    const handleEditSave = useCallback(() => {
        if (editingCell && editedData) {
            const { rowIndex, colName } = editingCell;
            const newData = [...editedData];
            newData[rowIndex] = { ...newData[rowIndex], [colName]: editedValue };
            setEditedData(newData);
            setEditingCell(null); // Exit editing mode
            setEditedValue(''); // Clear edited value
        }
    }, [editingCell, editedData, editedValue]);

    // Inline editing: handle Enter key press
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleEditSave();
        }
    }, [handleEditSave]);

    function extractGoogleDriveFileId(url: string) {
        const match = url.match(/\/d\/([^/]+)/);
        return match ? match[1] : "";
    }


    // Handler to show modal with URL and redirect button
    const handleUrlClick = useCallback((url: string) => {
        // const embedUrl = getGoogleDriveEmbedUrl(url); 

        setIsModalOpen(true);
        setModalContent(url); // Always show the original URL in the modal

        const url_id = extractGoogleDriveFileId(url)
        const new_url = "https://drive.google.com/file/d/" + url_id + "/preview"
        setModalEmbedUrl(new_url);
    }, [getGoogleDriveEmbedUrl]);

    // Export to CSV
    const exportToCSV = useCallback(() => {
        // Export the *entire* processedDataForPagination, not just the currently displayed page
        if (!processedDataForPagination || processedDataForPagination.length === 0) {
            alert("No data to export.");
            return;
        }

        const csvRows = [];
        const headers = visibleColumns.length > 0 ? visibleColumns : allHeaders; // Export visible columns or all if none selected
        csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));


        processedDataForPagination.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                // Handle null, undefined, and escape double quotes
                return `"${(value === null || value === undefined ? '' : String(value)).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${currentSheetName || 'exported_data'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [processedDataForPagination, currentSheetName, visibleColumns, allHeaders]);

    // Export to XLSX
    const exportToXLSX = useCallback(() => {
        // Export the *entire* processedDataForPagination, not just the currently displayed page
        if (!processedDataForPagination || processedDataForPagination.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = visibleColumns.length > 0 ? visibleColumns : allHeaders;
        const exportData = processedDataForPagination.map(row => {
            const newRow: SheetRow = {};
            headers.forEach(header => {
                newRow[header] = row[header];
            });
            return newRow;
        });

        // Create a worksheet from the data
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        // Append the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, currentSheetName || 'Sheet1');
        // Write the workbook to a file
        XLSX.writeFile(wb, `${currentSheetName || 'exported_data'}.xlsx`);
    }, [processedDataForPagination, currentSheetName, visibleColumns, allHeaders]);

    // Handler for search input change to reset page
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    }, []);


    //Text validation
    const ValidateText = (text: string) => {
        if (text.includes("Date(")) {
            return DateTextConvertToReadable(text)
        }


        return text
    }

    // Render loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600">Loading data...</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="p-8 text-red-700 bg-red-100 border border-red-400 rounded-md">
                <h2 className="text-xl font-bold mb-2">Error</h2>
                <p>{error}</p>
                <p className="mt-2 text-sm">Please ensure the Google Sheet is publicly accessible and the Sheet ID/Name are correct.</p>
            </div>
        );
    }

    // Render message when no sheet ID/Name is provided or no data was fetched
    const displaySheetId = propSheetId || currentSheetId;
    const displaySheetName = propSheetName || currentSheetName;

    if (!displaySheetId || !displaySheetName || !data) {
        return (
            <div className="flex items-center justify-center p-8 text-gray-500">
                <p>Enter a Google Sheet link and sheet name to view data.</p>
            </div>
        );
    }

    // Handle case where data is an empty array AFTER successful fetch
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 text-gray-500">
                <p>The specified Google Sheet or sheet name contains no data.</p>
            </div>
        );
    }

    // Crucial check: Ensure displayedData is not null before proceeding to render the table.
    if (!displayedData) {
        return (
            <div className="flex items-center justify-center p-8 text-gray-500">
                <p>No data available for display after processing.</p>
            </div>
        );
    }

    // Render the table and controls when data is available
    return (
        <div className="p-4 overflow-auto h-full flex flex-col">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Search Input */}
                <input
                    type="text"
                    placeholder="Search data..."
                    value={searchTerm}
                    onChange={handleSearchChange} // Use the new handler
                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 flex-grow"
                />

                {/* Column Visibility Dropdown */}
                <div className="relative inline-block text-left z-10">
                    <button
                        type="button"
                        className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        id="menu-button"
                        aria-expanded="true"
                        aria-haspopup="true"
                        onClick={() => document.getElementById('column-dropdown')?.classList.toggle('hidden')}
                    >
                        Columns
                        <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <div
                        className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none hidden"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="menu-button"
                        tabIndex={-1}
                        id="column-dropdown"
                    >
                        <div className="py-1 max-h-60 overflow-y-auto" role="none">
                            {allHeaders.map(header => (
                                <label
                                    key={header}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                    role="menuitem"
                                    tabIndex={-1}
                                >
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                                        checked={visibleColumns.includes(header)}
                                        onChange={() => handleColumnToggle(header)}
                                    />
                                    <span className="ml-2">{header}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Local Storage Save Toggle */}
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={saveToLocalStorage}
                        onChange={(e) => {
                            setSaveToLocalStorage(e.target.checked);
                            if (typeof window !== 'undefined') {
                                localStorage.setItem('sheetViewerSavePreference', String(e.target.checked));
                            }
                        }}
                        className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                    />
                    <span className="text-sm text-gray-700 whitespace-nowrap">Save Sheet to Browser</span>
                </label>


                {/* Export Buttons */}
                <button
                    onClick={exportToCSV}
                    className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-sm"
                >
                    Export CSV
                </button>
                <button
                    onClick={exportToXLSX}
                    className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                >
                    Export XLSX
                </button>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 h-[80vh]">
                <table className="min-w-full divide-y divide-gray-200 bg-white w-">
                    <thead className="bg-gray-50 w-20 sticky">
                        <tr>
                            {visibleColumns.map((header) => (
                                <th
                                    key={header}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-100 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap bg-slate-500"
                                    onClick={() => handleSort(header)}
                                >
                                    <div className="flex items-center max-w-[300px] truncate">
                                        {header}
                                        {sortColumn === header && (
                                            <span className="ml-1">
                                                {sortDirection === 'asc' ? '▲' : '▼'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 w-20">
                        {displayedData.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns.length} className="px-4 py-4 text-center text-gray-500">
                                    {searchTerm ? "No matching data found on this page." : "No data to display on this page."}
                                </td>
                            </tr>
                        ) : (
                            displayedData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50 ">
                                    {visibleColumns.map((header) => {
                                        const isCurrentlyEditing = editingCell?.rowIndex === (rowIndex + (currentPage - 1) * itemsPerPage) && editingCell?.colName === header;
                                        const cellValue = row[header];
                                        const isUrl = typeof cellValue === 'string' && cellValue.startsWith('https://');

                                        return (
                                            <td
                                                key={`${rowIndex}-${header}`}
                                                className={`px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-200`}
                                                onClick={() => {
                                                    // If it's a URL, open the modal. Otherwise, enable editing.
                                                    if (isUrl) {
                                                        handleUrlClick(String(cellValue));
                                                    } else {
                                                        handleCellClick(rowIndex, header, cellValue);
                                                    }
                                                }}
                                            >

                                                {isCurrentlyEditing ? (
                                                    <input
                                                        type="text"
                                                        value={String(editedValue === null ? '' : editedValue)}
                                                        onChange={handleEditChange}
                                                        onBlur={handleEditSave}
                                                        onKeyDown={handleKeyDown}
                                                        autoFocus
                                                        className="p-1 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                    />
                                                ) : (
                                                    isUrl ? (
                                                        // Render as a clickable link that opens the modal
                                                        <a
                                                            href="#" // Use # to prevent default navigation
                                                            onClick={(e) => {
                                                                e.preventDefault(); // Prevent default link behavior
                                                                e.stopPropagation(); // Prevent cell editing if clicked on link
                                                                handleUrlClick(String(cellValue));
                                                            }}
                                                            className="text-blue-600 underline cursor-pointer truncate block w-[400px]"
                                                        >
                                                            {String(cellValue)}
                                                        </a>
                                                    ) : (
                                                        ValidateText(String(cellValue === null ? '' : cellValue))
                                                    )
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-center items-center mt-4 space-x-2">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <span className="text-gray-700">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>

            {/* Modal for displaying content (iframe or link) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full m-4 h-[90vh] flex flex-col">
                        <h3 className="text-lg font-bold mb-4">File Viewer</h3>


                        <>
                            <p className="text-sm text-gray-600 mb-2">
                                {"Attempting to display embedded content. If it doesn't load, it might be due to security settings or an invalid embed link."}
                            </p>
                            <div className="flex-grow flex items-center justify-center border border-gray-300 rounded-md overflow-hidden">
                                <iframe
                                    src={modalEmbedUrl}
                                    title="Embedded Content"
                                    className="w-full h-full"
                                    allowFullScreen
                                    // Restrict iframe capabilities for security, adjust as needed
                                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                                ></iframe>
                            </div>
                        </>


                        {/* Always show the original URL and the "Go to Link" button */}
                        <div className="mt-4 text-sm text-gray-500">
                            Original URL: <a href={modalContent} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{modalContent}</a>
                        </div>

                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    window.open(modalContent, '_blank'); // Always redirect when this button is clicked
                                    setIsModalOpen(false); // Close modal after attempting redirect
                                }}
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            >
                                Go to Link
                            </button>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SheetViewer;