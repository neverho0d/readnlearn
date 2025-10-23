import React, { useState, useEffect } from "react";
import { useI18n } from "../../lib/i18n/I18nContext";
import { useSettings } from "../../lib/settings/SettingsContext";
import {
    QuickTranslationService,
    QuickTranslationResult,
} from "../../adapters/translation/QuickTranslationService";
import { DeepLDriver } from "../../adapters/mt/DeepLDriver";
import { GoogleDriver } from "../../adapters/mt/GoogleDriver";

interface PhraseSelectorProps {
    selectedText: string;
    // eslint-disable-next-line no-unused-vars
    onPhraseSelect: (data: { phrase: string; tags: string[]; translation: string }) => void;
    onClear: () => void;
    suggestedTags?: string[];
}

export const PhraseSelector: React.FC<PhraseSelectorProps> = ({
    selectedText,
    onPhraseSelect,
    onClear,
    suggestedTags = [],
}) => {
    const { t } = useI18n();
    const { settings } = useSettings();
    const phrase = selectedText;
    const [tags, setTags] = useState<string>(suggestedTags.join(", "));

    // Quick translation state
    const [quickTranslation, setQuickTranslation] = useState<QuickTranslationResult | null>(null);
    const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
    const [translationError, setTranslationError] = useState<string | null>(null);
    const [translationService, setTranslationService] = useState<QuickTranslationService | null>(
        null,
    );

    // Initialize translation service (only when API keys change)
    useEffect(() => {
        // Only initialize if we don't have a service or if API keys changed
        if (translationService) {
            return;
        }

        const initializeService = async () => {
            try {
                console.log("🔧 Initializing translation service");

                // Create drivers with current settings
                const deeplDriver = new DeepLDriver({
                    apiKey: settings.deeplApiKey || "",
                    baseUrl: settings.deeplBaseUrl || "https://api-free.deepl.com",
                    cache: true,
                    dailyCap: settings.dailyCapDeepL || 2.0,
                });

                const googleDriver = new GoogleDriver({
                    apiKey: settings.googleApiKey || "",
                    baseUrl: settings.googleBaseUrl || "https://translation.googleapis.com",
                    cache: true,
                    dailyCap: settings.dailyCapGoogle || 2.0,
                });

                const service = new QuickTranslationService(deeplDriver, googleDriver);
                setTranslationService(service);
                console.log("✅ Translation service initialized");
                console.log(
                    "🔍 Global cache stats:",
                    QuickTranslationService.getGlobalCacheStats(),
                );

                // Log initial provider stats
                const stats = service.getProviderStats();
                console.log("📊 Initial provider stats:", {
                    deepl: {
                        weight: (stats.get("deepl")?.weight || 0.5) * 100 + "%",
                        samples: stats.get("deepl")?.responseTimes.length || 0,
                    },
                    google: {
                        weight: (stats.get("google")?.weight || 0.5) * 100 + "%",
                        samples: stats.get("google")?.responseTimes.length || 0,
                    },
                });
            } catch (error) {
                console.error("❌ Failed to initialize translation service:", error);
            }
        };

        initializeService();

        // Cleanup function
        return () => {
            if (translationService) {
                console.log("🧹 Cleaning up translation service");
                // Clear any pending operations
                setTranslationService(null);
            }
        };
    }, [
        settings.deeplApiKey,
        settings.googleApiKey,
        settings.deeplBaseUrl,
        settings.googleBaseUrl,
    ]);

    // Fetch quick translation when phrase changes (with debounce)
    useEffect(() => {
        // Clear any existing timeout
        const timeoutId = setTimeout(() => {
            const fetchQuickTranslation = async () => {
                if (!phrase.trim() || !translationService || !settings.l1 || !settings.l2) {
                    return;
                }

                // Skip if L1 == L2 (explanation mode)
                if (settings.l1 === settings.l2) {
                    setQuickTranslation(null);
                    setTranslationError(null);
                    return;
                }

                setIsLoadingTranslation(true);
                setTranslationError(null);

                try {
                    const result = await translationService.translate({
                        text: phrase,
                        from: settings.l2,
                        to: settings.l1,
                    });
                    setQuickTranslation(result);

                    // Log updated provider stats
                    const stats = translationService.getProviderStats();
                    console.log("📊 Updated provider stats:", {
                        deepl: {
                            weight: (stats.get("deepl")?.weight || 0.5) * 100 + "%",
                            samples: stats.get("deepl")?.responseTimes.length || 0,
                            successRate: (stats.get("deepl")?.successRate || 0) * 100 + "%",
                            emaResponseTime:
                                Math.round(stats.get("deepl")?.emaResponseTime || 0) + "ms",
                        },
                        google: {
                            weight: (stats.get("google")?.weight || 0.5) * 100 + "%",
                            samples: stats.get("google")?.responseTimes.length || 0,
                            successRate: (stats.get("google")?.successRate || 0) * 100 + "%",
                            emaResponseTime:
                                Math.round(stats.get("google")?.emaResponseTime || 0) + "ms",
                        },
                    });
                } catch (error) {
                    console.error("❌ Quick translation failed:", error);
                    setTranslationError(
                        error instanceof Error ? error.message : "Translation failed",
                    );
                } finally {
                    setIsLoadingTranslation(false);
                }
            };

            fetchQuickTranslation();
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [phrase, translationService, settings.l1, settings.l2]);

    const handleSavePhrase = () => {
        if (!phrase.trim()) {
            return;
        }
        const parsedTags = tags
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        onPhraseSelect({ phrase, tags: parsedTags, translation: "" });
        setTags("");
        onClear();
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClear();
            } else if (event.key === "Enter" && phrase.trim()) {
                handleSavePhrase();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [phrase, tags, onClear]);

    return (
        <div
            style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "var(--panel)",
                position: "fixed",
                right: "20px",
                bottom: "20px",
                maxWidth: "min(92vw, 480px)",
                width: "480px",
                zIndex: 1100,
                boxShadow: `0 10px 25px var(--dropdown-shadow)`,
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Phrase (read-only display without label/border) */}
                    <div
                        style={{
                            width: "100%",
                            fontSize: "16px",
                            color: "var(--text)",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                        }}
                    >
                        {phrase || "—"}
                    </div>

                    {/* Quick Translation Section */}
                    {settings.l1 !== settings.l2 && (
                        <div
                            style={{
                                border: "none",
                                backgroundColor: "var(--background)",
                                maxHeight: "120px",
                                overflowY: "auto",
                            }}
                        >
                            {isLoadingTranslation && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        color: "var(--text-secondary)",
                                        fontSize: "14px",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "16px",
                                            height: "16px",
                                            border: "2px solid var(--border-color)",
                                            borderTop: "2px solid var(--primary)",
                                            borderRadius: "50%",
                                            animation: "spin 1s linear infinite",
                                        }}
                                    />
                                    Translating...
                                </div>
                            )}

                            {translationError && (
                                <div
                                    style={{
                                        color: "var(--error)",
                                        fontSize: "14px",
                                        fontStyle: "italic",
                                    }}
                                >
                                    {translationError}
                                </div>
                            )}

                            {quickTranslation && !isLoadingTranslation && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: "16px",
                                            fontStyle: "italic",
                                            color: "var(--text-secondary)",
                                            lineHeight: "1.4",
                                            marginBottom: "8px",
                                        }}
                                    >
                                        {quickTranslation.translation}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: "var(--muted)",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span>
                                            via {quickTranslation.provider}
                                            {quickTranslation.cached && " (cached)"}
                                        </span>
                                        {!quickTranslation.cached && (
                                            <span>{quickTranslation.responseTime}ms</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tags (editable, comma-separated) */}
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "14px",
                                fontWeight: 500,
                                marginBottom: "4px",
                            }}
                        >
                            Tags
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g. travel, greeting <- comma separated"
                            style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid var(--border-color)",
                                borderRadius: "4px",
                                fontSize: "14px",
                                boxSizing: "border-box",
                                backgroundColor: "var(--panel)",
                                color: "var(--text)",
                                boxShadow: "none",
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                        onClick={onClear}
                        style={{
                            padding: "6px 10px",
                            backgroundColor: "transparent",
                            color: "var(--primary)",
                            border: "1px solid var(--primary)",
                            borderRadius: "4px",
                            cursor: "pointer",
                            height: 30,
                            lineHeight: "16px",
                            fontSize: 12,
                        }}
                    >
                        {t.cancel}
                    </button>
                    <button
                        onClick={handleSavePhrase}
                        disabled={!phrase.trim()}
                        style={{
                            padding: "6px 12px",
                            backgroundColor: phrase.trim()
                                ? "var(--primary)"
                                : "var(--border-color)",
                            color: "var(--primary-contrast)",
                            border: "none",
                            borderRadius: "44px",
                            cursor: phrase.trim() ? "pointer" : "not-allowed",
                            height: 30,
                            lineHeight: "16px",
                            fontSize: 12,
                        }}
                    >
                        {t.savePhrase}
                    </button>
                </div>
            </div>
        </div>
    );
};
