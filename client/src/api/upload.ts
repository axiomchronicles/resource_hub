// src/lib/api/uploads.ts
import axios from "axios";

/**
 * Thin API layer for upload endpoints.
 * - Keeps all axios usage here
 * - Exposes simple helpers that accept progress/signal hooks
 */

const Baseurl = import.meta.env.VITE_API_URL || "";

function getAuthHeaders() {
  try {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
  } catch {
    return {};
  }
}

import type { AxiosProgressEvent } from "axios";

/** Options used for upload functions */
export interface UploadOptions {
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  signal?: AbortSignal;
}

/** Response shapes (adjust to match your backend) */
export interface SimpleUploadResp {
  success?: boolean;
  fileUrl?: string;
  fileId?: string;
  [k: string]: any;
}

export interface InitiateResp {
  uploadId: string;
  [k: string]: any;
}

export interface CompleteResp {
  success?: boolean;
  fileUrl?: string;
  fileId?: string;
  [k: string]: any;
}

/** Simple single-request upload */
export async function uploadSimpleApi(file: File, opts: UploadOptions = {}): Promise<SimpleUploadResp> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("filename", file.name);
  form.append("mimeType", file.type);

  const resp = await axios.post(`${Baseurl}/uploads/simple/`, form, {
    headers: {
      ...getAuthHeaders(),
      // axios will set multipart boundary automatically
    },
    onUploadProgress: opts.onUploadProgress,
    signal: opts.signal,
  });
  return resp.data;
}

/** Initiate chunked upload (returns uploadId) */
export async function initiateChunkedApi(
  filename: string,
  mimeType: string,
  size: number
): Promise<InitiateResp> {
  const resp = await axios.post(
    `${Baseurl}/uploads/initiate/`,
    { filename, mimeType, size },
    { headers: getAuthHeaders() }
  );
  return resp.data;
}

/** Upload a single chunk for an uploadId */
export async function uploadChunkApi(
  uploadId: string,
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  opts: UploadOptions = {}
): Promise<{ ok?: boolean }> {
  const form = new FormData();
  form.append("chunk", chunk);
  form.append("chunkIndex", String(chunkIndex));
  form.append("totalChunks", String(totalChunks));

  const resp = await axios.post(`${Baseurl}/uploads/${uploadId}/chunk`, form, {
    headers: getAuthHeaders(),
    onUploadProgress: opts.onUploadProgress,
    signal: opts.signal,
  });

  return resp.data;
}

/** Complete chunked upload */
export async function completeChunkApi(uploadId: string): Promise<CompleteResp> {
  const resp = await axios.post(`${Baseurl}/uploads/${uploadId}/complete/`, {}, { headers: getAuthHeaders() });
  return resp.data;
}

/** Create resource (after files uploaded) */
export async function createResourceApi(payload: any): Promise<any> {
  const resp = await axios.post(`${Baseurl}/uploads/resources/`, payload, { headers: getAuthHeaders() });
  return resp.data;
}
