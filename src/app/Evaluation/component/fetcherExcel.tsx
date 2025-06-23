// lib/fetcherExcel.ts
// This file contains the function to fetch data from a Google Sheet.

/* eslint-disable @typescript-eslint/no-explicit-any */


type GoogleSheetCell = {
  v?: string | number | boolean | null;
  f?: string; // formatted value
};

type GoogleSheetRow = {
  c: (GoogleSheetCell | null)[];
};

type GoogleSheetResponse = {
  status?: string;
  errors?: { detailed_message?: string }[];
  table?: {
    cols: { id: string; label: string; type: string }[];
    rows: GoogleSheetRow[];
  };
};

/**
 * Extracts the Google Sheet ID from a given URL.
 * @param url The full URL of the Google Sheet.
 * @returns The Google Sheet ID as a string, or null if not found.
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)(?:[\/#?]|$)/);
  return match ? match[1] : null;
}

/**
 * Fetches data from a specified Google Sheet.
 * @param sheetId The ID of the Google Sheet.
 * @param sheetName The name of the specific sheet/tab within the spreadsheet.
 * @returns A Promise that resolves to an array of records, where each record represents a row.
 */
export async function fetchSheetData(
  sheetId: string,
  sheetName: string
): Promise<Record<string, string | number | boolean>[]> { // Updated return type to exclude null
  if (!sheetId || !sheetName) {
    throw new Error("Sheet ID and Sheet Name cannot be empty.");
  }

  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName
    )}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Network response was not ok. Status: ${response.status} ${response.statusText}`
      );
    }

    const text = await response.text();
    let jsonString: string;

    // The Google Visualization API wraps the JSONP response.
    // We need to extract the JSON string from within the setResponse() call.
    const jsonpMatch = text.match(
      /google\.visualization\.Query\.setResponse\((.*)\);/
    );


    if (jsonpMatch && jsonpMatch[1]) {
      jsonString = jsonpMatch[1]
    } else {
      // Fallback for direct JSON, though less common with gviz/tq endpoint
      try {
        // Attempt to parse directly if it's pure JSON (unlikely for gviz/tq)
        JSON.parse(text);
        jsonString = text;
      } catch (e) {
        throw new Error("Could not extract JSON from Google Sheets response." + e);
      }
    }

    const json: GoogleSheetResponse = JSON.parse(jsonString);

    console.log("Fetched Google Sheet Data:", json);

    if (json.status === "error") {
      throw new Error(
        `Google Sheets API error: ${json.errors?.[0]?.detailed_message || "Unknown API error"
        }`
      );
    }


    if (!json.table || !json.table.cols) {
      throw new Error("Unexpected response structure: 'table' or 'table.cols' not found.");
    }

    const headers = json.table.cols.map(col => col.label);

    if (!json.table.rows) {
      // If there are columns but no rows, return an empty array
      return [];
    }

    const processedRows = json.table.rows.map((row) => {
      const cells = row.c || []; // Ensure cells is an array even if 'c' is null/undefined
      return cells.map((cell) => {
        // If cell is null, or its value/formatted value is undefined/null, return ""
        if (cell === null || (cell.v === undefined && cell.f === undefined)) {
          return "";
        }
        if (cell.v !== undefined && cell.v !== null) {
          return cell.v;
        }
        if (cell.f !== undefined) {
          return cell.f;
        }
        return ""; // Return blank for other empty or undefined cases
      });
    });

    if (processedRows.length === 0) {
      return [];
    }

    const result = processedRows.map((row) => {
      const obj: Record<string, string | number | boolean> = {};

      headers.forEach((header, colIndex) => {
        const value = row[colIndex];

        if (value === undefined || value === null || value === "") {
          obj[header] = "";
        } else if (typeof value === "string") {
          obj[header] = value;
        } else if (typeof value === "number") {
          obj[header] = value;
        } else if (typeof value === "boolean") {
          obj[header] = value;
        } else {
          obj[header] = String(value);
        }
      });

      return obj;
    });

    return result;
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    throw error;
  }
}