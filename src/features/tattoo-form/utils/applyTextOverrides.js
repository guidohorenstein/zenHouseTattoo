function setByPath(target, path, value) {
  const segments = path.split(".");
  let cursor = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];

    if (typeof cursor[segment] !== "object" || cursor[segment] === null) {
      cursor[segment] = {};
    } else {
      cursor[segment] = { ...cursor[segment] };
    }

    cursor = cursor[segment];
  }

  cursor[segments[segments.length - 1]] = value;
}

export function applyTextOverrides(baseTranslations, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return baseTranslations;

  const result = structuredClone(baseTranslations);

  for (const [path, value] of Object.entries(overrides)) {
    if (typeof value !== "string" || value.length === 0) continue;
    setByPath(result, path, value);
  }

  return result;
}
