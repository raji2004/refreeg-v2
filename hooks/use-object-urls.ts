"use client";

import { useEffect, useMemo } from "react";

/** Object URLs for local files, revoked when the files change or unmount. */
export function useObjectUrls(files: File[]) {
  const urls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(
    () => () => urls.forEach((url) => URL.revokeObjectURL(url)),
    [urls],
  );

  return urls;
}

export function useObjectUrl(file: File | null) {
  const files = useMemo(() => (file ? [file] : []), [file]);
  return useObjectUrls(files)[0] as string | undefined;
}
