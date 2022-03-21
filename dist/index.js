"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
const json_beautify_1 = __importDefault(require("json-beautify"));
const dotenv_1 = __importDefault(require("dotenv"));
const events_1 = require("events");
events_1.EventEmitter.defaultMaxListeners = 0;
if (process.env.NODE_ENV === "production") {
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
}
else {
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env.local") });
}
const baseDir = process.env.TARGET;
const localDir = path_1.default.resolve(__dirname, "download");
const dataPath = path_1.default.resolve(__dirname, "data.json");
let data = {};
let fileChange = [];
// let Client = require("ssh2-sftp-client");
let sftp = new ssh2_sftp_client_1.default();
if (!(0, fs_1.existsSync)(localDir)) {
    fs_1.default.mkdirSync(localDir);
}
try {
    let fileRead = (0, fs_1.readFileSync)(dataPath, "utf8");
    data = JSON.parse(fileRead);
}
catch (error) {
    console.log(error.message || "Unable to read file JSON input. Default none");
}
refresh();
setInterval(refresh, 1000 * 60 * 5);
function refresh() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Refreshing data...");
        try {
            yield sftp.connect({
                host: process.env.HOST,
                port: Number(process.env.PORT),
                username: process.env.USER,
                password: process.env.PASSWORD,
            });
            yield readDir(sftp, baseDir);
            if (fileChange.length) {
                yield downloadFile();
                (0, fs_1.writeFileSync)(dataPath, (0, json_beautify_1.default)(data, null, 2, 100));
            }
            console.log("Done refresh");
            sftp.end();
        }
        catch (error) {
            console.log(error);
        }
    });
}
function downloadFile() {
    return __awaiter(this, void 0, void 0, function* () {
        const downloadPromise = fileChange.map((file) => __awaiter(this, void 0, void 0, function* () {
            const folderLocalPath = path_1.default.join(localDir, file.path);
            const remoteFileLocation = file.path + "/" + file.file.name;
            yield fs_1.default.promises.mkdir(folderLocalPath, { recursive: true });
            const res = sftp.get(remoteFileLocation, path_1.default.join(folderLocalPath, file.file.name));
            data[remoteFileLocation] = file.file;
            return res;
        }));
        fileChange = [];
        const downloadResult = yield Promise.allSettled(downloadPromise);
        console.log(`Total file changed: ${fileChange.length}. Total file downloaded: ${downloadResult.filter((it) => it.status === "fulfilled").length}`);
    });
}
function readDir(client, dirPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield client.list(dirPath);
        const files = result.filter((item) => item.type === "-");
        const folders = result.filter((item) => item.type === "d");
        // Check file changed
        files.forEach((file) => {
            const filePath = dirPath + "/" + file.name;
            if (!data.hasOwnProperty(filePath)) {
                console.log(`New File: ${filePath}. File size: ${file.size}`);
                fileChange.push({ path: dirPath, file: file });
            }
            else if (data[filePath].modifyTime != file.modifyTime || data[filePath].size != file.size) {
                console.log(`File changed: ${filePath}. File size: ${file.size}`);
                fileChange.push({ path: dirPath, file: file });
            }
        });
        // if node is folder => Read folder
        const folderReadPromise = folders.map((folder) => {
            const folderPath = dirPath + "/" + folder.name;
            return readDir(client, folderPath);
        });
        yield Promise.allSettled(folderReadPromise);
    });
}
