// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const util = require('util');
const inspector = require('inspector');

const addDecorationWithText = (contentText, line, column, activeEditor) => {
	const decorationType = vscode.window.createTextEditorDecorationType({
		 after: {
			 contentText, 
			 margin: "20px"
		 }
	})

	const range = new vscode.Range(
		new vscode.Position(line, column),
		new vscode.Position(line, column), 
	)
		activeEditor.setDecorations(decorationType, [{}])
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	inspector.open()
	const session = new inspector.Session()
	session.connect()

	const post = util.promisify(session.post).bind(session)
	await post("Debugger.enable")
	await post("Runtime.enable")
	let disposable = vscode.commands.registerCommand('kopi-js.helloWorld', async function () {
		const activeEditor = vscode.window.activeTextEditor;

		if(activeEditor){
			return
		}

		const document = activeEditor.document;
		const filename = path.basename(document.uri.toString());

		const {scriptId} = await post("Runtime.compileScript", {
			expression: document.getText(),
			sourceURL: filename,
			persistScript: true
		})

		await post("Runtime.runScript", {
			scriptId
		})

		const data = await post("Runtime.globalLexicalScopeNames", {
			executionContextId: 1
		})

		data.names.map(async (expression) => {
			const {result: {value}} = await post("Runtime.evaluate", {
				expression, contextID: 1
			})

			const {result} = await post("Debugger.searchInContext", {
				scriptId,
				query: expression
			})
			addDecorationWithText(
				`${value}`
				result[0].lineNumber,
				result[0].lineContent.length,
				activeEditor

			)
		})
		
		vscode.window.showInformationMessage('\ (•◡•) / Done!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
