import React, { useState } from "react";
import { useI18n } from "../../lib/i18n/I18nContext";

interface PhraseSelectorProps {
  selectedText: string;
  onPhraseSelect: (phrase: string) => void;
  onClear: () => void;
}

export const PhraseSelector: React.FC<PhraseSelectorProps> = ({
  selectedText,
  onPhraseSelect,
  onClear,
}) => {
  const { t } = useI18n();
  const [phrase, setPhrase] = useState(selectedText);
  const [context, setContext] = useState("");
  const [translation, setTranslation] = useState("");

  const handleSavePhrase = () => {
    if (!phrase.trim()) {
      alert(t.phraseEmpty);
      return;
    }
    onPhraseSelect(phrase);
    alert(`"${phrase}" ${t.phraseSaved}`);
    setPhrase("");
    setContext("");
    setTranslation("");
    onClear();
  };

  return (
    <div
      style={{
        border: "1px solid #bee3f8",
        borderRadius: "8px",
        padding: "16px",
        backgroundColor: "#ebf8ff",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, color: "#2b6cb0", fontWeight: "bold" }}>
            {t.selectPhrase}
          </h3>
          <span
            style={{
              backgroundColor: "#3182ce",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            {t.selectedText}
          </span>
        </div>

        <hr
          style={{ margin: 0, border: "none", borderTop: "1px solid #bee3f8" }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "4px",
              }}
            >
              {t.phrase}
            </label>
            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={t.editPhrasePlaceholder}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "4px",
              }}
            >
              {t.context}
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={t.contextPlaceholder}
              rows={2}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "4px",
              }}
            >
              {t.translation}
            </label>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder={t.translationPlaceholder}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={onClear}
            style={{
              padding: "8px 16px",
              backgroundColor: "white",
              color: "#3182ce",
              border: "1px solid #3182ce",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSavePhrase}
            disabled={!phrase.trim()}
            style={{
              padding: "8px 16px",
              backgroundColor: phrase.trim() ? "#3182ce" : "#e2e8f0",
              color: "white",
              border: "none",
              borderRadius: "44px",
              cursor: phrase.trim() ? "pointer" : "not-allowed",
            }}
          >
            {t.savePhrase}
          </button>
        </div>
      </div>
    </div>
  );
};
