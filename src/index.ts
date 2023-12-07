import { mediaScannerMachine } from "./mediaScannerMachine";
import { createActor } from "xstate";

(async () => {
  console.log("Starting the awesome media scanner thingy");

  const mediaScannerActor = createActor(mediaScannerMachine);

  mediaScannerActor.subscribe((state) => {
    console.log(state.context);
  });

  mediaScannerActor.start();
  mediaScannerActor.send({ type: "START_SCAN" });
})();
