# Inline Autocomplete with Gemini

An ultra-fast, intelligent inline code completion extension for Visual Studio Code powered by Google Gemini models. It provides ghost-text suggestions contextually matched to your active file's language.

---

## ✨ Features

- **Ghost Text Inline Suggestions:** Code completions appear as you type, matching your cursor position and context.
- **Language-Aware completions:** Automatically detects the current file's language (`TypeScript`, `Python`, `Go`, `HTML`, etc.) and enforces strict syntax and idioms.
- **Context-Aware Fill-In-The-Middle (FIM):** Analyzes both the prefix (code before cursor) and suffix (code after cursor) to generate precise gap-fill completions.
- **Status Bar Metrics:** Displays live cumulative token usage and operational state right in your status bar.
- **Quick On/Off Toggle:** Turn completions on or off instantly with a click or hotkey.
- **Debounced Inference:** Efficient 250ms debouncing ensures completions trigger only during pauses in typing, saving API quota.

---

## 🚀 Getting Started

### 1. Get an API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Create and copy a personal API key.

### 2. Configure the Extension
1. Open Settings in VS Code (`Ctrl + ,` on Windows/Linux or `Cmd + ,` on macOS).
2. Search for `Gemini Autocomplete`.
3. Paste your key into the **`geminiAutocomplete.apiKey`** field.

---

## ⌨️ Shortcuts & Commands

| Action | Windows / Linux | macOS | Command Palette |
| :--- | :--- | :--- | :--- |
| **Toggle On / Off** | `Ctrl + Alt + G` | `Cmd + Alt + G` | `Gemini Autocomplete: Toggle On/Off` |
| **Accept Suggestion** | `Tab` | `Tab` | Built-in editor action |

You can also click directly on the status bar icon (`$(sparkle) Gemini: ... tok`) in the bottom-right corner to toggle the extension between active and inactive.

---

## ⚙️ Extension Settings

This extension contributes the following configuration options:

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `geminiAutocomplete.apiKey` | `string` | `""` | Your Google Gemini API Key. |
| `geminiAutocomplete.enabled` | `boolean` | `true` | Enable or disable inline autocompletions. |
| `geminiAutocomplete.model` | `string` | `"gemini-3.5-flash-lite"` | Gemini model used for generation (`gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`). |

---

## 📊 Status Bar Metrics

The status bar displays real-time extension state:
- **Active:** `$(sparkle) Gemini: <tokens> tok` — Displays total session tokens consumed. Hovering over it displays the token breakdown of your most recent completion call.
- **Disabled:** `$(circle-slash) Gemini: OFF` — Indicates the extension is paused; no requests will be sent.

---

## 📄 License

This extension is licensed under the [MIT License](LICENSE).