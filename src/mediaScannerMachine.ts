import { createMachine, assign, fromPromise } from "xstate";
import { checkFilePermissions, evaluateFiles, scanDirectories } from "./fileHandlers";

export const mediaScannerMachine = createMachine(
  {
    context: {
      basePath: "/Volumes/media/Movies",
      destinationPath: "/Volumes/media/4kMovies",
      directoriesToCheck: [],
      dirsToEvaluate: [],
      dirsToMove: [],
      filesToEmail: [],
      dirsToReport: [],
      processedFiles: [],
    },
    id: "mediaScanner",
    initial: "idle",
    states: {
      idle: {
        on: {
          START_SCAN: {
            target: "Scanning",
          },
        },
      },
      Scanning: {
        description:
          'Scan the media library and check for directories \n\nFor every file we can confirm is a directory, we add it to the context. \n\nIgnore the files already present in the ledger. Those are "known good"',
        invoke: {
          id: "scanLibrary",
          input: ({context: { basePath }}) => ({ basePath }),
          src: fromPromise(({input}) => scanDirectories(input.basePath)),
          onDone: [
            {
              target: "CheckingFilePermissions",
              actions: assign({ directoriesToCheck: (ctx) => ctx.event.output }),
            },
          ],
          onError: [
            {
              target: "ReportingErrors",
            },
          ],
        },
      },
      CheckingFilePermissions: {
        description:
          "check the file permissions for all the files we need to scan.\n\nif we do not have read/write permissions, we update the context with the filenames/locations.\n\nif there are no files with read/write permissions, we move to the error state",
        invoke: {
          id: "checkFilePermissions",
          input: ({context: { directoriesToCheck }}) => ({ directoriesToCheck }),
          src: fromPromise(({input: { directoriesToCheck }}) => checkFilePermissions(directoriesToCheck)),
          onDone: [
            {
              target: "EvaluatingFiles",
              actions: assign(({event}) => {
                return {
                  dirsToEvaluate: event.output['dirsToEvaluate'],
                  dirsToReport: event.output['dirsToReport'],
                }
              })
            },
          ],
          onError: [
            {
              target: "ReportingErrors",
              actions: assign(({event}) => {
                return {
                  dirsToReport: event.error["dirsToReport"],
                }
              })
            },
          ],
        },
      },
      ReportingErrors: {
        description:
          "Send a message with error details to the proper destination.\n\nErrors could be the lack of read/write permissions or path not existing",
        entry: {
          type: "emailErrors",
        },
        on: {
          RESTART: {
            target: "idle",
          },
        },
      },
      EvaluatingFiles: {
        description:
          "Evaluate the files to determine their resolution. If they are 4K, move them to a new directory",
        invoke: {
          id: "evaluatingFiles",
          input: ({context: { dirsToEvaluate }}) => ({ dirsToEvaluate }),
          src: fromPromise(({input: { dirsToEvaluate }}) => evaluateFiles(dirsToEvaluate)),
          onDone: [
            {
            },
          ],
        },
      },
      MovingFiles: {
        description: "move all the files present in context to the destination library",
        invoke: {
          src: "moveFiles",
          id: "invoke-ek4dc",
          onDone: [
            {
              target: "UpdateLedger",
            },
          ],
          onError: [
            {
              target: "ReportingErrors",
            },
          ],
        },
      },
      UpdateLedger: {
        description:
          "Send a message with a list of all files moved to the proper destination.\n\nUpdate the ledger with the contents of the source library and save it to disk",
        entry: [
          {
            type: "updateLedger",
          },
          {
            type: "emailResults",
          },
        ],
        on: {
          RESTART: {
            target: "idle",
          },
        },
      },
    },
    types: {
      events: {} as { type: "START_SCAN" } | { type: "RESTART" },
      context: {} as {
        basePath: string;
        destinationPath: string;
        directoriesToCheck: string[];
        dirsToEvaluate: string[];
        dirsToMove: string[];
        filesToEmail: string[];
        dirsToReport: string[];
        processedFiles: string[];
      },
    },
  },
  {
    actions: {
      emailErrors: ({ context, event }) => {},
      updateLedger: ({ context, event }) => {},
      emailResults: ({ context, event }) => {},
    },
    guards: {},
    delays: {},
  },
);
