export const ExtensionIds = {
    commands: {
        connect: "databricksNotebookRenderer.connect",
        disconnect: "databricksNotebookRenderer.disconnect",

        selectCompute: "databricksNotebookRenderer.selectCompute",

        createSession: "databricksNotebookRenderer.createSession",
        restartSession: "databricksNotebookRenderer.restartSession",

        runCell: "databricksNotebookRenderer.runCell",
        runAllCells: "databricksNotebookRenderer.runAllCells"
    },

    contexts: {
        connected: "databricksNotebookRenderer.connected",
        computeSelected: "databricksNotebookRenderer.computeSelected",
        sessionActive: "databricksNotebookRenderer.sessionActive"
    },

    views: {
        explorer: "databricksNotebookRenderer.explorer"
    }
} as const;