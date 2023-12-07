import * as fs from "fs";

export async function scanningDirectories(basePath: string) {
  return new Promise((resolve, reject) => {
    let validDirectories: string[] = [];
    fs.readdir(basePath, function (err, files) {
      if (err) {
        reject("Unable to scan directory: " + err);
      }
      files.forEach(async function (file) {
        let stats = fs.statSync(basePath + "/" + file);
        if (stats.isDirectory()) {
          validDirectories.push(file);
        }
      });
      if (validDirectories.length === 0) {
        reject("No valid directories found");
      }
      resolve(validDirectories);
    });
  });
}

export async function checkingFilePermissions(
  basePath: string,
  pathSuffixes: string[]
) {
  return new Promise((resolve, reject) => {
    console.log("checking file permissions...");
    let filesToMove: string[] = [];
    for (const pathSuffix of pathSuffixes) {
      const path = basePath + "/" + pathSuffix;
      console.log(path);
      try {
        fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK);
        console.log("file can be read and written");
        filesToMove.push(path);
      } catch (err) {
        console.error("no access to file", path);
      }
    }
    resolve(filesToMove);
  });
}
