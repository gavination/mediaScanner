import { scanDirectories } from "./fileHandlers";
import { mediaScannerMachine } from "./mediaScannerMachine";
import { createActor } from "xstate";

// let context = {
//   basePath: "/Volumes/media/Movies",
//   destinationPath: "/Volumes/media/4kMovies",
//   validFilePathSuffixes: [],
//   filesToEvaluate: [],
//   filestoMove: [],
//   filesToEmail: [],
//   filesToReport: [],
//   processedFiles: [],
// };

(async () => {

  console.log("Starting the awesome media scanner thingy");

  // await scanningDirectories(context.basePath).then((result) => {
  //   console.log('results: ', result);
  // }).catch((error) => {
  //   console.log('error: ', error);
  // });

  const mediaScannerActor = createActor(mediaScannerMachine);

  mediaScannerActor.subscribe((state) => {
    console.log({
      state: state.value,
      context: state.context,
      error: state.error,
    });
  });

  mediaScannerActor.start();
  mediaScannerActor.send({ type: "START_SCAN" });
})();
