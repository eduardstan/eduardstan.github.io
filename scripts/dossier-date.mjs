const months = new Map([
  ["gennaio", "01"],
  ["febbraio", "02"],
  ["marzo", "03"],
  ["aprile", "04"],
  ["maggio", "05"],
  ["giugno", "06"],
  ["luglio", "07"],
  ["agosto", "08"],
  ["settembre", "09"],
  ["ottobre", "10"],
  ["novembre", "11"],
  ["dicembre", "12"],
  ["january", "01"],
  ["february", "02"],
  ["march", "03"],
  ["april", "04"],
  ["may", "05"],
  ["june", "06"],
  ["july", "07"],
  ["august", "08"],
  ["september", "09"],
  ["october", "10"],
  ["november", "11"],
  ["december", "12"],
]);

function validDate(year, month, day) {
  const value = `${year}-${month}-${day}`;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

export function metadataDate(text) {
  const value = String(text ?? "").trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return validDate(match[1], match[2], match[3]);
  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (match) return validDate(match[3], match[2].padStart(2, "0"), match[1].padStart(2, "0"));
  match = /^(\d{1,2})\s+([\p{L}]+)\s+(\d{4})$/u.exec(value);
  if (!match) return null;
  const monthName = match[2]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const month = months.get(monthName);
  return month ? validDate(match[3], month, match[1].padStart(2, "0")) : null;
}
