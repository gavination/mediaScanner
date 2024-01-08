import { setup, createMachine, assign, fromPromise } from "xstate";
import {
  checkFilePermissions,
  evaluateFiles,
  moveFiles,
  scanDirectories,
} from "./fileHandlers";

export const mediaScannerMachine = setup({
  types: {} as {
    input: {
      basePath: string;
      destinationPath: string;
    };
    context: {
      basePath: string;
      destinationPath: string;
      directoriesToCheck: string[];
      dirsToEvaluate: string[];
      dirsToMove: string[];
      filesToEmail: string[];
      dirsToReport: string[];
      processedFiles: string[];
      acceptedFileTypes: string[];
    };
    events:
      | {
          type: "START_SCAN";
        }
      | {
          type: "RESTART";
        };
  },
  actors: {
    scanDirectories: fromPromise(
      async ({ input }: { input: { basePath: string } }) =>
        await scanDirectories(input.basePath)
    ),
    checkFilePermissions: fromPromise(
      async ({ input }: { input: { directoriesToCheck: string[] } }) =>
        await checkFilePermissions(input.directoriesToCheck)
    ),
    evaluateFiles: fromPromise(
      async ({ input }: { input: { dirsToEvaluate: string[]; acceptedFileTypes: string[] } }) =>
        await evaluateFiles(input.dirsToEvaluate, input.acceptedFileTypes)
    ),
    moveFiles: fromPromise(
      async ({ input }: { input: { dirsToMove: string[]; destinationPath: string } }) =>
        await moveFiles(input.dirsToMove, input.destinationPath)
    ),
  },
  actions: {
    emailErrors: () => {
      console.log("emailing errors");
    },
    updateDirectoriesToCheck: assign({
      directoriesToCheck: (_, params: { dirs: string[] }) => params.dirs,
    }),
    updateEvaluateDirs: assign({
      dirsToEvaluate: (_, params: { dirs: string[] }) => params.dirs,
    }),
    updateReportDirs: assign({
      dirsToReport: (_, params: { dirs: string[] }) => params.dirs,
    }),
    updateMoveDirs: assign({
      dirsToMove: (_, params: { dirs: string[] }) => params.dirs,
    }),
  },
}).createMachine({
  context: ({ input }) => ({
    basePath: input.basePath,
    destinationPath: input.destinationPath,
    directoriesToCheck: [],
    dirsToEvaluate: [],
    dirsToMove: [],
    filesToEmail: [],
    dirsToReport: [],
    processedFiles: [],
    acceptedFileTypes: [
      "mp4",
      "mkv",
      "avi",
      "mov",
      "m4v",
      "mpg",
      "mpeg",
      "wmv",
      "flv",
      "ts",
      "mts",
    ],
  }),
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
        input: ({ context: { basePath } }) => ({ basePath }),
        src: "scanDirectories",
        onDone: [
          {
            target: "CheckingFilePermissions",
            actions: [
              {
                type: "updateDirectoriesToCheck",
                params: ({ event }) => ({ dirs: event.output["dirs"] }),
              },
            ],
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
        input: ({ context: { directoriesToCheck } }) => ({
          directoriesToCheck,
        }),
        src: "checkFilePermissions",
        onDone: [
          {
            target: "EvaluatingFiles",
            actions: [
              {
                type: "updateEvaluateDirs",
                params: ({ event }) => ({
                  dirs: event.output["dirsToEvaluate"],
                }),
              },
              {
                type: "updateReportDirs",
                params: ({ event }) => ({ dirs: event.output["dirsToReport"] }),
              },
            ],
          },
        ],
        onError: [
          {
            target: "ReportingErrors",
            actions: [
              {
                type: "updateReportDirs",
                params: ({ event }) => ({ dirs: event.error["dirsToReport"] }),
              },
            ],
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
        input: ({ context: { dirsToEvaluate, acceptedFileTypes } }) => ({
          dirsToEvaluate,
          acceptedFileTypes,
        }),
        src: "evaluateFiles",
        onDone: [
          {
            target: "MovingFiles",
            actions: [
              {
                type: "updateMoveDirs",
                params: ({ event }) => ({ dirs: event.output["dirsToMove"] }),
              },
            ],
          },
        ],
      },
    },

    MovingFiles: {
      description:
        "Move all the files present in context to the destination library",
      invoke: {
        input: ({ context: { dirsToMove, destinationPath } }) => ({
          dirsToMove,
          destinationPath,
        }),
        id: "moveFiles",
        src: "moveFiles",
        onError: [
          {
            target: "ReportingErrors",
          },
        ],

        onDone: "idle",
      },
    },
  },
});
