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
