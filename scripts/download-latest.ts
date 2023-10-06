import {
	BlobReader,
	BlobWriter,
	ZipReader,
} from "https://deno.land/x/zipjs@v2.7.29/index.js";
import * as path from "https://deno.land/std@0.203.0/path/mod.ts";

const repoDownloadUrl =
	"https://github.com/pulse-browser/browser/archive/refs/heads/alpha.zip";

const repoZip = await (await fetch(repoDownloadUrl)).blob();
console.log("Downloaded repo");

const zip = new ZipReader(new BlobReader(repoZip));
const zipEntries = await zip.getEntries();

for (const entry of zipEntries) {
	if (!entry.filename.includes("/themes/addons/pulse/dark/")) continue;
	if (entry.filename.endsWith("/")) continue;

	const writer = new BlobWriter();
	await entry.getData(writer);
	const blob: Blob = await writer.blob;

	const filename = path.basename(entry.filename);
	const buffer = new Uint8Array(await blob.arrayBuffer());

	await Deno.writeFile(filename, buffer);
	console.log("Extracted: " + filename);
}

await zip.close();
