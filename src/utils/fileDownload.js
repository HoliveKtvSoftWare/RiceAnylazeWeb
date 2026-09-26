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

const downloadBlob = (response, fallback = 'download') => {
  const filename = extractFilename(response.headers['content-disposition'], fallback);
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

export { downloadBlob, extractFilename };