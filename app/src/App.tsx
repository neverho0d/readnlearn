import { useEffect, useState } from "react";
import { SettingsProvider } from "./lib/settings/SettingsContext";
import { I18nProvider } from "./lib/i18n/I18nContext";
import { LanguageSettings } from "./features/settings/LanguageSettings";
import { TextReader } from "./features/reader/TextReader";

function App() {
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <SettingsProvider>
      <I18nProvider>
        <div style={{ minHeight: "100vh", backgroundColor: "#f7fafc" }}>
          <LanguageSettings
            onLoadSampleText={handleLoadSampleText}
            isLoading={isLoading}
          />
          <div style={{ paddingTop: "60px", padding: "80px 20px 20px 20px" }}>
            <TextReader
              onPhraseSelect={handlePhraseSelect}
              onLoadSampleText={handleLoadSampleText}
              isLoading={isLoading}
            />
          </div>
        </div>
      </I18nProvider>
    </SettingsProvider>
  );
}

export default App;
