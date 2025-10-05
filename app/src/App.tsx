import { useEffect, useState } from "react";
import { SettingsProvider } from "./lib/settings/SettingsContext";
import { I18nProvider } from "./lib/i18n/I18nContext";
import { ThemeProvider } from "./lib/settings/ThemeContext";
import { LanguageSettings } from "./features/settings/LanguageSettings";
import { TextReader } from "./features/reader/TextReader";
import "./App.css";
import { useAppMode } from "./lib/state/appMode";
import { DictionaryView } from "./features/phrases/DictionaryView";

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [externalText, setExternalText] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Read-n-Learn";
  }, []);

  const handlePhraseSelect = (phrase: string, context: string) => {
    // Placeholder for future DB save
    console.log("Selected phrase:", phrase);
    console.log("Context:", context);
  };

  const handleLoadSampleText = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  const handleLoadFile = (text: string) => {
    setExternalText(text);
    // Also dismiss instructions so the new text shows without sample/intro
    localStorage.setItem("readnlearn-instructions-dismissed", "true");
  };

  return (
    <SettingsProvider>
      <ThemeProvider>
        <I18nProvider>
          <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
            <LanguageSettings
              onLoadSampleText={handleLoadSampleText}
              isLoading={isLoading}
              onLoadFile={handleLoadFile}
            />
            <MainContent
              isLoading={isLoading}
              externalText={externalText}
              onLoadSampleText={handleLoadSampleText}
              onPhraseSelect={handlePhraseSelect}
            />
          </div>
        </I18nProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export default App;

function MainContent(props: {
  isLoading: boolean;
  externalText: string | null;
  onLoadSampleText: () => void;
  onPhraseSelect: (p: string, c: string) => void;
}) {
  const { mode } = useAppMode();
  const { isLoading, externalText, onLoadSampleText, onPhraseSelect } = props;
  return (
    <div style={{ paddingTop: "60px", padding: "80px 20px 20px 20px" }}>
      {mode === "reading" && (
        <TextReader
          onPhraseSelect={onPhraseSelect}
          onLoadSampleText={onLoadSampleText}
          isLoading={isLoading}
          content={externalText ?? ""}
        />
      )}
      {mode === "dictionary" && <DictionaryView />}
      {mode === "learning" && <div />}
    </div>
  );
}
