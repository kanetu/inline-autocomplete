import * as vscode from 'vscode';
import { GoogleGenAI } from '@google/genai';

let debounceTimer: NodeJS.Timeout | undefined;
let statusBarItem: vscode.StatusBarItem;
let sessionTotalTokens = 0;

export function activate(context: vscode.ExtensionContext) {
  console.log('Gemini Autocomplete is active.');

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'geminiAutocomplete.toggle'; // Clicking status bar toggles ON/OFF
  updateStatusBar();
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const toggleCommand = vscode.commands.registerCommand('geminiAutocomplete.toggle', async () => {
    const config = vscode.workspace.getConfiguration('geminiAutocomplete');
    const currentState = config.get<boolean>('enabled', true);
    const newState = !currentState;

    await config.update('enabled', newState, vscode.ConfigurationTarget.Global);
    updateStatusBar();

    vscode.window.showInformationMessage(
      `Gemini Autocomplete: ${newState ? 'ON' : 'OFF'}`
    );
  });
  context.subscriptions.push(toggleCommand);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('geminiAutocomplete.enabled')) {
        updateStatusBar();
      }
    })
  );

  const provider: vscode.InlineCompletionItemProvider = {
    async provideInlineCompletionItems(
      document: vscode.TextDocument,
      position: vscode.Position,
      inlineContext: vscode.InlineCompletionContext,
      token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionList | vscode.InlineCompletionItem[]> {

      // 1. Fetch API key from VS Code settings
      const config = vscode.workspace.getConfiguration('geminiAutocomplete');
      const isEnabled = config.get<boolean>('enabled', true);
      const apiKey = config.get<string>('apiKey');
      const model = config.get<string>('model') || 'gemini-3.5-flash-lite';

      if (!isEnabled) {
        return []
      };

      if (!apiKey) {
        console.log('Please set api key at geminiAutocomplete.apiKey');
        return [];
      }

      if (!model){
        console.log('Please set model at geminiAutocomplete.model');
        return [];
      }

      // 2. Debounce: Wait 300ms after user pauses typing
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const shouldProceed = await new Promise<boolean>((resolve) => {
        debounceTimer = setTimeout(() => resolve(true), 300);
        token.onCancellationRequested(() => {
          clearTimeout(debounceTimer);
          resolve(false);
        });
      });

      if (!shouldProceed || token.isCancellationRequested) {
        return [];
      }

      // 3. Extract surrounding context (50 lines before, 20 lines after)
      const startLine = Math.max(0, position.line - 50);
      const endLine = Math.min(document.lineCount - 1, position.line + 20);

      const prefix = document.getText(
        new vscode.Range(new vscode.Position(startLine, 0), position)
      );
      const suffix = document.getText(
        new vscode.Range(position, new vscode.Position(endLine, document.lineAt(endLine).text.length))
      );

      // Do not run on blank files or blank lines with no context
      if (!prefix.trim()) {
        return [];
      }

      // Get language identifier of the active document
      const languageId = document.languageId;


      // 4. Request completion from Gemini
      try {
        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `You are an ultra-fast inline code autocompletion engine specialized in the "${languageId}" programming language.
The user provides <LANGUAGE>, <PREFIX> (code before cursor), and <SUFFIX> (code after cursor).
Your sole task is to generate ONLY the exact valid ${languageId} code that fills the gap between <PREFIX> and <SUFFIX>.

STRICT RULES:
1. Adhere strictly to "${languageId}" syntax, idioms, casing conventions, and best practices. Do not mix constructs from other programming languages.
2. Output RAW plain code ONLY.
3. NEVER wrap code in markdown blocks (\`\`\` or \`\`\`${languageId}).
4. NEVER repeat code from <PREFIX> or <SUFFIX>.
5. COMMENT HANDLING:
   - If <PREFIX> ends with a comment initiator (e.g. "//", "/*", "#", "--"):
     a) Do NOT output duplicate comment markers (do not output "//" again).
     b) Complete the thought of the comment on the current line.
     c) Then break into the next line(s) and provide the relevant, functional ${languageId} code implementation that fulfills that comment.
6. Generate only the immediate relevant statement, expression, or function block needed. If no valid completion is possible, return nothing.`;

        const prompt = `<LANGUAGE>\n${languageId}\n</LANGUAGE>\n<PREFIX>\n${prefix}\n</PREFIX>\n<SUFFIX>\n${suffix}\n</SUFFIX>\nMissing ${languageId} code:`;

        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.1,
            maxOutputTokens: 128,
            stopSequences: ['</PREFIX>', '<SUFFIX>', '<LANGUAGE>']
          }
        });

        if (token.isCancellationRequested) {
          return [];
        }

        // 2. Read and update token metrics
        if (response.usageMetadata) {
          const {  totalTokenCount = 0 } = response.usageMetadata;
          sessionTotalTokens += totalTokenCount;
          updateStatusBar(totalTokenCount)
        }

        let suggestion = response.text || '';
        // Clean markdown backticks if model includes them
        suggestion = suggestion.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');

        // Clean accidental leading comment markers if prefix already ends with one
        const trimmedPrefix = prefix.trimEnd();
        if (trimmedPrefix.endsWith('//') && suggestion.trimStart().startsWith('//')) {
          suggestion = suggestion.replace(/^\s*\/\/\s?/, ' ');
        } else if (trimmedPrefix.endsWith('#') && suggestion.trimStart().startsWith('#')) {
          suggestion = suggestion.replace(/^\s*#\s?/, ' ');
        }

        if (!suggestion.trim()) {
          return [];
        }

        return [
          new vscode.InlineCompletionItem(
            suggestion,
            new vscode.Range(position, position)
          )
        ];
      } catch (err) {
        console.error('Error fetching Gemini completion:', err);
        return [];
      }
    }
  };

  // Register the inline provider for all languages
  const disposable = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    provider
  );

  context.subscriptions.push(disposable);
}

function updateStatusBar(lastCallTokens?: number) {
  const config = vscode.workspace.getConfiguration('geminiAutocomplete');
  const isEnabled = config.get<boolean>('enabled', true);

  if (!isEnabled) {
    statusBarItem.text = `$(circle-slash) Gemini: OFF`;
    statusBarItem.tooltip = `Gemini Autocomplete is OFF.\nClick or press Ctrl+Alt+G (Cmd+Alt+G) to turn ON.`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    return;
  }

  // When Enabled
  statusBarItem.backgroundColor = undefined;
  statusBarItem.text = `$(sparkle) GA: ${sessionTotalTokens.toLocaleString()} tokens`;

  let tooltipText = `Gemini Autocomplete is ON.\nSession Tokens: ${sessionTotalTokens.toLocaleString()}\nClick to turn OFF.`;
  if (lastCallTokens !== undefined) {
    tooltipText = `Last completion: ${lastCallTokens} tokens\n${tooltipText}`;
  }
  statusBarItem.tooltip = tooltipText;
}

export function deactivate() {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (statusBarItem) statusBarItem.dispose();
}