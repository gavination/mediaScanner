import * as fs from "fs";
import { resolve } from "path";

export async function scanDirectories(basePath: string) {
  return new Promise((resolve, reject) => {
    console.log("scanning directories...");

    let validDirectories: string[] = [];
    fs.readdir(basePath, function (err, files) {
      if (err) {
        reject("Unable to scan directory: " + err);
      }
      files.forEach(async function (file) {
        const fullPath = basePath + "/" + file;
        let stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          validDirectories.push(fullPath);
        }
      });
      if (validDirectories.length === 0) {
        reject("No valid directories found");
      }
      resolve(validDirectories);
    });
  });
}

export async function checkFilePermissions(
directories: string[]
) {
  return new Promise((resolve, reject) => {
    console.log("checking directory permissions...");
    let dirsToEvaluate: string[] = [];
    let dirsToReport: string[] = [];
    for (const dir of directories) {
      // join the base path and the path suffix
      try {
        fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
        console.log("directory can be read and written: ", dir);
        dirsToEvaluate.push(dir);
      } catch (err) {
        console.error(`cannot access directory ${dir}. Error: ${err}`);
        dirsToReport.push(dir);
      }
    }
    if (dirsToEvaluate.length === 0) {
      reject({message: "No accessible files found to move", dirsToReport});
    }
    resolve({dirsToEvaluate, dirsToReport});
  });
}
export async function evaluateFiles(dirsToEvaluate: string[]){
  // for each string in dirsToEvaluate, open the folder to find a proper media file. 
  // if a proper media file is found, check the file's dimensions.
  // 1080p is 1920x1080
  // 4K is 3840x2160
  // if the file is 4K, add it to the filesToMove array

  console.log('checking files in directories...');
  for (const dir of dirsToEvaluate){
    console.log ('scanning directory: ', dir);
    // get the files in the directory
    fs.readdir(dir, function (err, files) {
      if (err) {
        console.error("Unable to scan directory: " + err);
      }
      files.forEach(async function (file) {
        const fullPath = dir + "/" + file;
        console.log('fullPath: ', fullPath);
      });
    });
  }
  resolve();
}
