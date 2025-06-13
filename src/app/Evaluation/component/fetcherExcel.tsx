// fetcherExcel.ts
const SHEET_ID = "1CCOXZ_ZMMSoRQltEIfZ6VOBfQc9RhjoJoGcXTsKe0gQ";
const SHEET_NAME = "REGION V";

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
    rows: GoogleSheetRow[];
  };
};

export async function fetchSheetData(): Promise<
  Record<string, string | number | boolean | null>[]
> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      SHEET_NAME
    )}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();

    let jsonString: string;

    if (text.includes("google.visualization.Query.setResponse(")) {
      const start = text.indexOf("(") + 1;
      const end = text.lastIndexOf(")");
      jsonString = text.substring(start, end);
    } else {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("No JSON found in response");
      }
      jsonString = text.substring(jsonStart, jsonEnd);
    }

    const json: GoogleSheetResponse = JSON.parse(jsonString);

    if (json.status === "error") {
      throw new Error(
        `Google Sheets API error: ${
          json.errors?.[0]?.detailed_message || "Unknown error"
        }`
      );
    }

    if (!json.table?.rows) {
      throw new Error("Unexpected response structure - no table.rows found");
    }

    const processedRows = json.table.rows.map((row) => {
      const cells = row.c || [];
      return cells.map((cell) => {
        if (!cell) return "";
        if (cell.v !== undefined && cell.v !== null) {
          return cell.v;
        }
        if (cell.f !== undefined) {
          return cell.f;
        }
        return "";
      });
    });

    if (processedRows.length === 0) {
      return [];
    }

    const headers = processedRows[0].map((header) =>
      header
        ? header.toString().trim()
        : `Column_${Math.random().toString(36).substr(2, 9)}`
    );

    const dataRows = processedRows.slice(1);

    const result = dataRows.map((row) => {
      const obj: Record<string, string | number | boolean | null> = {};

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
