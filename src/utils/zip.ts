import archiver from "archiver";
import { createReadStream, createWriteStream } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";

export async function zipDirToStream(dir: string, name: string): Promise<Readable> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.directory(dir, false);
  archive.finalize();
  // Archiver returns a stream already
  return archive as unknown as Readable;
}