import React, { createContext, useContext, useMemo } from "react";
import { useSettings } from "../settings/SettingsContext";
import { translations, Translations } from "./translations";

export const getSampleTextForLanguage = (l2Language: string): string => {
  const langTranslations = translations[l2Language] || translations.en;
  return langTranslations.sampleText || translations.en.sampleText;
};

interface I18nContextType {
  t: Translations;
  currentLanguage: string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { settings } = useSettings();
  const currentLanguage = settings.l1 || "en";

  const t = useMemo<Translations>(() => {
    return translations[currentLanguage] || translations.en;
  }, [currentLanguage]);

  const value: I18nContextType = { t, currentLanguage };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
