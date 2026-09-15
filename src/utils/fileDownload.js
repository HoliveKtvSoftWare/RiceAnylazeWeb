const timestampSuffix = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const extractFilename = (disposition, fallback) => {
  if (!disposition) return fallback;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''));
  }
  const asciiMatch = disposition.match(/filename="?([^"]+)"?/i);
  if (asciiMatch) {
    return decodeURIComponent(asciiMatch[1].trim().replace(/^"|"$/g, ''));
  }
  return fallback;
};

const downloadBlob = (response, baseName, context = null, preferLocalFilename = false, unit = null) => {
  const ts = timestampSuffix();
  const unitPart = unit ? `_${unit}` : '';
  const ctx = context ? `${unitPart}(${context})` : '';
  const dotIdx = baseName.lastIndexOf('.');
  const stem = dotIdx > 0 ? baseName.substring(0, dotIdx) : baseName;
  const ext = dotIdx > 0 ? baseName.substring(dotIdx) : '';
  const timestamped = `${stem}_${ts}${ctx}${ext}`;
  const filename = preferLocalFilename
    ? timestamped
    : extractFilename(response.headers['content-disposition'], timestamped);
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
};

export { downloadBlob, extractFilename, timestampSuffix };