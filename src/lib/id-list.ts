let cachedIds: number[] | null = null;

export async function getIdList(): Promise<number[]> {
  if (cachedIds) {
    return cachedIds;
  }

  const url = process.env.R2_ID_LIST_URL;
  if (!url) {
    throw new Error("R2_ID_LIST_URL is not configured");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ID list: ${response.status}`);
  }

  const ids: number[] = await response.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("ID list is empty or invalid");
  }

  cachedIds = ids;
  return cachedIds;
}
