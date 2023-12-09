import { createMachine, assign, fromPromise } from "xstate";
import { checkFilePermissions, evaluateFiles, moveFiles, scanDirectories } from "./fileHandlers";

export const mediaScannerMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QFtIEsCGBlAxhgdvmAE4B0aEANmAMRYAqAggEr0D6WAwowHIDaABgC6iUAAcA9rDQAXNBPyiQAD0QBGAMwBWLaQAcANgDsAJjVaBJgQYF6ANCACeiDQBYBpIxYEa1agVr+rgZaAL6hDqgQmLgERGSxhGj4UDQQCmDk+ABuEgDWmbB4+AAyaABGxBjEjoIiSCCS0nIKSqoIagCcep2enQadAv0aJl4hDs4IJoOkNsZaJjpG7q7hkejYxfGkifjJqSTEEmRilBgyAGbHyKRFBGWV1bXCSk2y8ooN7V09fQNDBhGYy0E0QgV6tg0GgM-gMBlc3VWERAURiWxIpE4AAswDg8vsAGJoagABRIyDQsGkClgaQyWVyBVIOBxeKJpPJlOp+FgdVeUnerS+iBMcI0pDcGj01iM5gWRlBUx0pFc7lsBjMlnMriMaxRG12GOxuPxKXZYDJxApVI+tMOx1Ip3OVytzNZeXNlut3N5Lwabxan1A7VFgIlrilMrlo0Vbj0+k6Iy0RkTrj0RhsGj1qM2cQxzDAkmIchSAFFiEdiLTmKWGCx6Hz-QLA20RUZlqRRtpLNCdMnFYD41Dh8sYdNutmDeiyKXshhKABXc6E4lwOlEBn5TJgOeL5dm1e++riZsfVtTIwCVykNTprSZnxeexORB6a+wrzacx6KUaTqT6Jc0IDEAFkJGyFdqDtCsHSdS5rlIZBwLAc0j35Zoz2FBAdXFLRfFFaENAzOFOkVDMPC0H98J-NQTCTAC0TzMgwIgg8oPXTJkkZTIkOyFDD0bE8MKFYNXw0DwRh8UVNGIgxn0mbt9GHBE9BMaY9EopFkXwCQIDgJQc0NYh0MFIMVEQABaAxFQs3ROns-otAjDN-ChMJkUM6dyCoMATJbLDaOMCVjDUlNXGmeZYwRCVhzMXx4QjQEGKA7Zdn2PzMNEjpAgMUgtETdtZXs1x+xfC9r28AQBFot9Fk6UZkqMzF3Ugi1ORtGkMpE8ypjUWVwyI+qnIzLtFTU3LhyhAq9DUOS4UaryCyLEsoHLSt4CbYSzJDTo1GvTpiPE0wjvkxAdXjHwoWqgRR0CK8FqY0hZ3nJcVtQrrtpFXb9sOm66Ju06EBmvKqq1SjDCMGb3PWQCmpY1qNqE0zz3CxVOmvKi3AK6wpQncJQiAA */
    context: {
      basePath: "your path here",
      destinationPath: "your path here",
      directoriesToCheck: [],
      dirsToEvaluate: [],
      dirsToMove: [],
      filesToEmail: [],
      dirsToReport: [],
      processedFiles: [],
      acceptedFileTypes: ['mp4', 'mkv', 'avi', 'mov', 'm4v', 'mpg', 'mpeg', 'wmv', 'flv', 'ts', 'mts'],
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
          src: fromPromise(async ({input}) => await scanDirectories(input.basePath)),
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
          src: fromPromise( async ({input: { directoriesToCheck }}) =>  await checkFilePermissions(directoriesToCheck)),
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
          input: ({context: { dirsToEvaluate, acceptedFileTypes }}) => ({ dirsToEvaluate, acceptedFileTypes}),
          src: fromPromise(async ({input: { dirsToEvaluate, acceptedFileTypes }}) => await evaluateFiles(dirsToEvaluate, acceptedFileTypes)),
          onDone: [
            {
              target: "MovingFiles",
              actions: assign(({event}) => {
                return {
                  dirsToMove: event.output['dirsToMove'],
                }
              })
            },
          ],
        },
      },

      MovingFiles: {
        description: "Move all the files present in context to the destination library",
        invoke: {
          input: ({context: { dirsToMove, destinationPath }}) => ({ dirsToMove, destinationPath }),
          src: fromPromise(async ({input: { dirsToMove, destinationPath }}) => await moveFiles(dirsToMove, destinationPath)),
          id: "moveFiles",

          onError: [
            {
              target: "ReportingErrors",
            },
          ],

          onDone: "idle"
        },
      }
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
        acceptedFileTypes: string[];
      },
    },
  },
  {
    actions: {
    },
    guards: {},
    delays: {},
  },
);
