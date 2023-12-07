import { createMachine, assign } from "xstate";

export const machine = createMachine(
  {
    context: {
      basePath: "Z:/Movies",
      destinationPath: "Z:4KMovies",
      validFilePathSuffixes: [],
      filesToEvaluate: [],
      filestoMove: [],
      filesToEmail: [],
      filesToReport: [],
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
          'Scan the media library and check the resolution of files. \n\nFor every file we find above 1080p, we add it to the context. \n\nIgnore the files already present in the ledger. Those are "known good"',
        invoke: {
          src: "inline",
          id: "scanLibrary",
          onDone: [
            {
              target: "CheckingFilePermissions",
              actions: assign({ validFilePathSuffixes: (ctx) => ctx.event.output }),
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
          src: "inline",
          id: "checkFilePermissions",
          onDone: [
            {
              target: "EvaluatingFiles",
              actions: assign({ filesToEvaluate: (ctx) => ctx.event.output }),
            },
          ],
          onError: [
            {
              target: "ReportingErrors",
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
          src: "evaluatingFiles",
          id: "invoke-r1znu",
          onDone: [
            {
              target: "MovingFiles",
              actions: assign({}),
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
        validFilePathSuffixes: unknown[];
        filesToEvaluate: unknown[];
        filestoMove: unknown[];
        filesToEmail: unknown[];
        filesToReport: unknown[];
        processedFiles: unknown[];
      },
    },
  },
  {
    actions: {
      emailErrors: ({ context, event }) => {},
      updateLedger: ({ context, event }) => {},
      emailResults: ({ context, event }) => {},
    },
    actors: {
      inline: createMachine({
        /* ... */
      }),
      moveFiles: createMachine({
        /* ... */
      }),
      evaluatingFiles: createMachine({
        /* ... */
      }),
    },
    guards: {},
    delays: {},
  },
);
