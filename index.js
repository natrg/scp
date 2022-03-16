// const ftp = require("basic-ftp");

// (async () => {
//   await example();
// })();

// async function example() {
//   const client = new ftp.Client();
//   // client.ftp.verbose = true;
//   try {
//     await client.access({
//       host: "10.2.8.31",
//       port: 22,
//       user: "root",
//       password: "111111",
//       // secure: true,
//     });
//     const files = await client.list();
//     console.log(files);
//     for (let i = 0; i < files.length; i++) {
//       console.log(files[i].name);
//       if (files[i].type == 1) {
//         await client.downloadTo(files[i].name, "./" + files[i].name);
//       }
//     }
//     // await client.uploadFrom("README.md", "README_FTP.md");
//     // await client.downloadTo("README_COPY.md", "README_FTP.md");
//   } catch (err) {
//     console.log(err);
//   }
//   client.close();
// }


const path = require('path')
const { Client } = require("node-scp");

async function test() {
  try {
    const client = await Client({
      host: "10.2.8.31",
      port: 22,
      username: "root",
      password: "111111",
      // privateKey: fs.readFileSync('./key.pem'),
      // passphrase: 'your key passphrase',
    });
    const result = await client.list("/root/nodejs/ansv_ldap");
    console.log(result);
    for (let i of result) {
        // console.log(i.type);
      if (i.type == "-") {
        await client.downloadFile(
          "/root/nodejs/ansv_ldap/" + i.name,
          path.join(path.resolve("./download"), i.name)
        );
      }
    }
    client.close(); // remember to close connection after you finish
  } catch (e) {
    console.log(e);
  }
}

test();
