import { productionLocked } from "./_lib/production";

export async function GET(): Promise<Response> {
  return productionLocked();
}

export async function POST(): Promise<Response> {
  return productionLocked();
}
