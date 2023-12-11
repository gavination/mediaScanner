import { scanDirectories } from './fileHandlers';
import { mediaScannerMachine } from './mediaScannerMachine';
import { createActor } from 'xstate';

(async () => {
  console.log('Starting the awesome media scanner thingy');

  const mediaScannerActor = createActor(mediaScannerMachine, {
    input: {
      basePath: '/Volumes/media/Movies',
      destinationPath: '/Volumes/media/4KMovies',
    },
  });

  mediaScannerActor.subscribe((state) => {
    console.log({
      state: state.value,
      error: state.error,
      context: state.context,
    });
  });

  mediaScannerActor.start();
  mediaScannerActor.send({ type: 'START_SCAN' });
})();
