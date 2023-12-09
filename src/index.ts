import { scanDirectories } from "./fileHandlers";
import { mediaScannerMachine } from "./mediaScannerMachine";
import { createActor } from "xstate";

(async () => {

  console.log("Starting the awesome media scanner thingy");

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
