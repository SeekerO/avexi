import moment from "moment";

export function convertExcelTimestamp(serial: number) {
  if (serial == null || isNaN(serial) || serial < 1) return ""; // Ensure invalid dates return empty
  return moment("1899-12-30").add(serial, "days").format("YYYY-MM-DD");
};

export function DateTextConvertToReadable(date: string) {
  const match = date.match(/Date\((\d+),(\d+),(\d+)\)/);

  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]); // 0-indexed
    const day = parseInt(match[3]);

    // Create date using Moment
    const formattedDate = moment({ year, month, day }).format("MMMM D, YYYY");

    return formattedDate
  } else {
    return ""
  }
}
