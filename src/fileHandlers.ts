import * as fs from "fs";
import * as fsExtra from "fs-extra";
import path, { dirname, resolve } from "path";
import probe from "node-ffprobe";
import mv from "mv";
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "fileHandlers" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],

});

export async function scanDirectories(basePath: string) {
  return new Promise((resolve, reject) => {
    logger.info("scanning directories...");

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
    logger.info("checking directory permissions...");
    let dirsToEvaluate: string[] = [];
    let dirsToReport: string[] = [];
    for (const dir of directories) {
      // join the base path and the path suffix
      try {
        fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
        logger.info(`directory ${dir} is accessible`);
        dirsToEvaluate.push(dir);
      } catch (err) {
        logger.error(`cannot access directory ${dir}. Error: ${err}`);
        dirsToReport.push(dir);
      }
    }
    if (dirsToEvaluate.length === 0) {
      reject({message: "No accessible files found to move", dirsToReport});
    }
    resolve({dirsToEvaluate, dirsToReport});
  });
}
export async function evaluateFiles(dirsToEvaluate: string[], acceptedFileTypes: string[]){
  // for each string in dirsToEvaluate, open the folder to find a proper media file. 
  // if a proper media file is found, check the file's dimensions.
  // 1080p is 1920x1080
  // 4K is 3840x2160
  // Assume anything over 1080p is 4K and add it to the list of files to move
  return new Promise(async (resolve, reject) => {
    logger.info('checking files in directories...');
    let dirsToMove: string[] = [];
    
    for (const dir of dirsToEvaluate) {
      // read the directory's files
      const filenames = fs.readdirSync(dir);
      // check each file's type
      for(const file of filenames){
        // if the file is a valid type, check the file's dimensions
        if(acceptedFileTypes.includes(file.split('.').pop()!)){
          // read the file's dimensions
          await probe(dir + "/" + file).then((result) => {
            console.log(result.streams[0].width, result.streams[0].height);
            if (result.streams[0].width > 1920 && result.streams[0].height > 1080){
              console.log(`file ${file} is greater than 1080p. Assuming 4K`);
              dirsToMove.push(dir + "/" + file);
            }
          }).catch((error) => {
            console.log('error reading file: ', error);
          });
        }
        
      }
    }
    if (dirsToMove.length === 0) {
      reject({message: "No files found to move", dirsToMove});
    }
    resolve({dirsToMove});
  })}

export async function moveFiles(dirsToMove: string[], destinationBasePath: string){
  // testing with the first file in the list
  return new Promise((resolve, reject) => {
    console.log('moving files...');
    const parentDir = path.dirname(dirsToMove[0]);
    const newDirName = path.basename(parentDir);
    const destinationDir = destinationBasePath + "/" + newDirName;

    fsExtra.move(parentDir, destinationDir, { overwrite: true }, (err) => {
      if (err) {
        console.error(err);
        reject(err);
      }
      console.log("files moved successfully");
      resolve({message: "files moved"});
    });
  
  });

}