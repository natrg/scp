import fs, { existsSync, readFileSync, writeFile } from "fs";
import path from "path";
import Client, { FileInfo } from "ssh2-sftp-client";
import beautify from "json-beautify";
import dotenv from 'dotenv';

require("events").EventEmitter.defaultMaxListeners = 0;

console.log(path.resolve(__dirname, "../.env.local"));


if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
} else {
  dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
}

const baseDir = process.env.TARGET;
const localDir = path.resolve(__dirname, "download");

console.log(localDir);

let data: { [key: string]: FileInfo } = {};
let fileChange: Array<{ path: string; file: FileInfo }> = [];
// let Client = require("ssh2-sftp-client");
let sftp = new Client();

if (!existsSync(localDir)) {
  fs.mkdirSync(localDir);
}
try {
  let fileRead = readFileSync(path.resolve(__dirname, "data.json"), "utf8");
  data = JSON.parse(fileRead);
} catch (error: any) {
  console.log(
    error.message || "Unable to read file JSON input. Default no file before"
  );
}

refresh();
setInterval(refresh, 1000 * 60 * 5);

function refresh() {
  console.log("Refreshing data...");

  sftp
    .connect({
      host: process.env.HOST,
      port: Number(process.env.PORT),
      username: process.env.USER,
      password: process.env.PASSWORD,
    })
    .then(() => {
      return readDir(sftp, baseDir);
    })
    .then(async () => {
      // console.log(fileChange);
      await downloadFile();
      console.log("Done refresh");
    })
    .then(() => {
      // console.log(data, "the data info");
      writeFile(
        path.resolve(__dirname, "data.json"),
        beautify(data, null as any, 2, 100),
        (err) => {
          if (err) {
            console.log(err);
          }
        }
      );
    })
    .then(() => {
      sftp.end();
    })
    .catch((err) => {
      console.log(err, "catch error");
    });
}

async function downloadFile() {
  let downloadResult = await Promise.allSettled(
    fileChange.map(async (file) => {
      const folderLocalPath = path.join(localDir, file.path);

      await fs.promises.mkdir(folderLocalPath, { recursive: true });
      const res = sftp.get(
        file.path + "/" + file.file.name,
        path.resolve(folderLocalPath, file.file.name)
      );
      data[file.path + "/" + file.file.name] = file.file;
      return res;
    })
  );
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
  files.forEach((file) => {
    const filePath = dirPath + "/" + file.name;
    if (!data.hasOwnProperty(filePath)) {
      console.log(`New File: ${filePath}. File size: ${file.size}`);
      fileChange.push({ path: dirPath, file: file });
    } else if (data[filePath].modifyTime != file.modifyTime) {
      console.log(`File changed: ${filePath}. File size: ${file.size}`);
      fileChange.push({ path: dirPath, file: file });
    }
  });
  await Promise.allSettled(
    folders.map((folder) => {
      const folderPath = dirPath + "/" + folder.name;
      return readDir(client, folderPath);
    })
  );
  // console.log("Done: ", dirPath);
}
