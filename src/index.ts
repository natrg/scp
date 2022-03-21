import fs, { existsSync, readFileSync, writeFile, writeFileSync } from "fs";
import path from "path";
import Client, { FileInfo } from "ssh2-sftp-client";
import beautify from "json-beautify";
import dotenv from "dotenv";
import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 0;

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
} else {
  dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
}

const baseDir = process.env.TARGET;
const localDir = path.resolve(__dirname, "download");
const dataPath = path.resolve(__dirname, "data.json");

let data: { [key: string]: FileInfo } = {};
let fileChange: Array<{ path: string; file: FileInfo }> = [];
// let Client = require("ssh2-sftp-client");
let sftp = new Client();

if (!existsSync(localDir)) {
  fs.mkdirSync(localDir);
}
try {
  let fileRead = readFileSync(dataPath, "utf8");
  data = JSON.parse(fileRead);
} catch (error: any) {
  console.log(error.message || "Unable to read file JSON input. Default none");
}

refresh();
setInterval(refresh, 1000 * 60 * 5);

async function refresh() {
  console.log("Refreshing data...");

  try {
    await sftp.connect({
      host: process.env.HOST,
      port: Number(process.env.PORT),
      username: process.env.USER,
      password: process.env.PASSWORD,
    });
    await readDir(sftp, baseDir);
    if (fileChange.length) {
      await downloadFile();
      writeFileSync(dataPath, beautify(data, null as any, 2, 100));
    }
    console.log("Done refresh");
    sftp.end();
  } catch (error) {
    console.log(error);
  }
}

async function downloadFile() {
  const downloadPromise = fileChange.map(async (file) => {
    const folderLocalPath = path.join(localDir, file.path);
    const remoteFileLocation = file.path + "/" + file.file.name;
    await fs.promises.mkdir(folderLocalPath, { recursive: true });
    const res = sftp.get(
      remoteFileLocation,
      path.join(folderLocalPath, file.file.name)
    );
    data[remoteFileLocation] = file.file;
    return res;
  });

  fileChange = [];
  const downloadResult = await Promise.allSettled(downloadPromise);
  console.log(
    `Total file changed: ${fileChange.length}. Total file downloaded: ${
      downloadResult.filter((it) => it.status === "fulfilled").length
    }`
  );
}

async function readDir(client: Client, dirPath: string): Promise<any> {
  const result = await client.list(dirPath);
  const files = result.filter((item) => item.type === "-");
  const folders = result.filter((item) => item.type === "d");

  // Check file changed
  files.forEach((file) => {
    const filePath = dirPath + "/" + file.name;
    if (!data.hasOwnProperty(filePath)) {
      console.log(`New File: ${filePath}. File size: ${file.size}`);
      fileChange.push({ path: dirPath, file: file });
    } else if (data[filePath].modifyTime != file.modifyTime || data[filePath].size != file.size) {
      console.log(`File changed: ${filePath}. File size: ${file.size}`);
      fileChange.push({ path: dirPath, file: file });
    }
  });

  // if node is folder => Read folder
  const folderReadPromise = folders.map((folder) => {
    const folderPath = dirPath + "/" + folder.name;
    return readDir(client, folderPath);
  });
  await Promise.allSettled(folderReadPromise);
}
