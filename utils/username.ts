
export function suggestUsername(
  email?: string | null,
  fullName?: string | null,
): string {
  const suffix = Math.floor(100 + Math.random() * 900).toString(); 

  
  if (fullName && fullName.trim().length >= 2) {
    const parts = fullName
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((p) => p.replace(/[^a-z0-9]/g, ""))
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]}_${parts[1]}_${suffix}`;
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return `${parts[0]}_${suffix}`;
    }
  }

  // Fallback to email prefix
  if (email) {
    const prefix = email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 20);

    if (prefix.length >= 2) {
      return `${prefix}_${suffix}`;
    }
  }

  // Last resort
  return `user_${suffix}`;
}
