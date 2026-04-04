import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedIds: number[] | null = null;

export function getIdList(): number[] {
  if (cachedIds) {
    return cachedIds;
  }

  const filePath = join(process.cwd(), "public/data/id-list.json");
  const ids: number[] = JSON.parse(readFileSync(filePath, "utf-8"));

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("ID list is empty or invalid");
  }

  cachedIds = ids;
  return cachedIds;
}
