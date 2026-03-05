import { getGatewayBaseURL } from "../config";

import type { UserMemory } from "./types";

export async function loadMemory() {
  const memory = await fetch(`${getGatewayBaseURL()}/api/memory`);
  const json = await memory.json();
  return json as UserMemory;
}
