export const autoSelectSingleOption = (items, fieldName) => {
  if (!items || items.length === 0) return null;

  if (items.length === 1) {
    const item = items[0];
    if (fieldName && item[fieldName] !== undefined) return item[fieldName];
    const lowerField = fieldName && fieldName.toLowerCase();
    if (lowerField && item[lowerField] !== undefined) return item[lowerField];
    const idField = lowerField ? lowerField.replace(/id$/, '') + 'Id' : null;
    if (idField && item[idField] !== undefined) return item[idField];
    if (item.id !== undefined) return item.id;
    if (item.value !== undefined) return item.value;
    const fieldRoot = lowerField ? lowerField.replace(/id$/, '') : null;
    const idKey = Object.keys(item).find((k) => {
      const lk = k.toLowerCase();
      if (!lk.endsWith('id')) return false;
      if (!fieldRoot) return true;
      return lk.includes(fieldRoot) || lk.includes('address');
    });
    if (idKey && item[idKey] !== undefined) return item[idKey];
    return null;
  }

  return null;
};

export const computeDefaultsMap = (lists) => {
  if (!lists || typeof lists !== 'object') return {};
  const defaults = {};
  Object.entries(lists).forEach(([fieldName, items]) => {
    const val = autoSelectSingleOption(items, fieldName);
    if (val !== null && val !== undefined) defaults[fieldName] = val;
  });
  return defaults;
};
