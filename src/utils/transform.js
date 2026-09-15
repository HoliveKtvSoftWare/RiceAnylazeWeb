const toCamelCase = (str) => str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const transformKeys = (obj) => {
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[toCamelCase(key)] = transformKeys(obj[key]);
    }
    return result;
  }
  return obj;
};

export { transformKeys, toCamelCase };