/**
 * API v1 response helpers — snake_case transforms, envelope, errors.
 */

import { NextResponse } from "next/server";

// -------------------------------------------------------
// Deep camelCase → snake_case key transform
// -------------------------------------------------------

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toSnakeCase<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase) as T;
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[camelToSnake(key)] = toSnakeCase(value);
    }
    return result as T;
  }
  return obj;
}

// -------------------------------------------------------
// Meta envelope
// -------------------------------------------------------

export function buildMeta(extra?: Record<string, unknown>) {
  return {
    rated_by: "airindex_v1",
    methodology_version: "1.0",
    last_updated: new Date().toISOString(),
    ...extra,
  };
}

// -------------------------------------------------------
// Response helpers
// -------------------------------------------------------

export function apiResponse(
  data: unknown,
  meta?: Record<string, unknown>,
  headers?: Headers,
  status = 200,
) {
  const body = { meta: buildMeta(meta), data };
  const res = NextResponse.json(body, { status });
  if (headers) {
    headers.forEach((value, key) => res.headers.set(key, value));
  }
  return res;
}

export function apiError(
  message: string,
  status: number,
  headers?: Headers,
) {
  const body = { meta: buildMeta(), error: message };
  const res = NextResponse.json(body, { status });
  if (headers) {
    headers.forEach((value, key) => res.headers.set(key, value));
  }
  return res;
}
