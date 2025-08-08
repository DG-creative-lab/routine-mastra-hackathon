import archiver from "archiver";
import { Readable } from "stream";

/**
 * Returns a Readable stream that emits a ZIP archive of `dir`.
 * You can pipe this directly to an HTTP response or anywhere you need a stream.
 */
export function zipDirToStream(dir: string): Readable {
  const archive = archiver("zip", { zlib: { level: 9 } });

  // Bubble any archiver errors up to your caller
  archive.on("error", err => {
    throw err;
  });

  // Recursively zip the contents of `dir` (no parent folder in the ZIP)
  archive.directory(dir, false);

  // Once all entries have been appended, finalize() tells archiver
  // there’s no more data coming and it should flush everything.
  archive.finalize();

  return archive;
}