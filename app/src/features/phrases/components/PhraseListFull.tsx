/**
 * PhraseListFull Component
 *
 * Used in Dictionary mode to display phrases with search filtering,
 * pagination, and full phrase management capabilities.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useSettings } from "../../../lib/settings/SettingsContext";
import { PhraseCardExtended } from "./PhraseCardExtended";
import { removePhrase } from "../../../lib/db/phraseStore";

export interface PhraseListFullProps {
    phrases: Array<{
        id: string;
        text: string;
        translation: string;
        explanation?: string;
        tags: string[];
        sourceFile?: string;
        source_file?: string;
    }>;
    loading?: boolean;
    // eslint-disable-next-line no-unused-vars
    onEdit?: (phraseId: string) => void;
}

export const PhraseListFull: React.FC<PhraseListFullProps> = ({
    phrases,
    loading = false,
    onEdit,
}) => {
    const [translatingPhrases, setTranslatingPhrases] = useState<Set<string>>(new Set());

    useEffect(() => {
        const translationStartedHandler = (event: Event) => {
            const customEvent = event as CustomEvent;
            setTranslatingPhrases((prev) => new Set([...prev, customEvent.detail.phraseId]));
        };
        const translationFinishedHandler = (event: Event) => {
            const customEvent = event as CustomEvent;
            setTranslatingPhrases((prev) => {
                const newSet = new Set(prev);
                newSet.delete(customEvent.detail.phraseId);
                return newSet;
            });
        };

        window.addEventListener("readnlearn:translation-started", translationStartedHandler);
        window.addEventListener("readnlearn:translation-finished", translationFinishedHandler);

        return () => {
            window.removeEventListener("readnlearn:translation-started", translationStartedHandler);
            window.removeEventListener(
                "readnlearn:translation-finished",
                translationFinishedHandler,
            );
        };
    }, []);
    const { settings } = useSettings();

    // Handle phrase removal
    const handleRemovePhrase = useCallback(async (phraseId: string) => {
        if (confirm("Remove this phrase?")) {
            try {
                await removePhrase(phraseId);
                // Search will be refreshed automatically via the PHRASES_UPDATED_EVENT
            } catch (error) {
                console.error("Failed to remove phrase:", error);
            }
        }
    }, []);

    // Handle jump to phrase in text
    const handleJumpToPhrase = useCallback((phraseId: string) => {
        try {
            const ev = new CustomEvent("readnlearn:jump-to-phrase-in-text", {
                detail: { id: phraseId },
            });
            window.dispatchEvent(ev);
        } catch {
            // ignore
        }
    }, []);

    if (loading) {
        return (
            <div
                style={{
                    padding: 16,
                    textAlign: "center",
                    color: "var(--muted)",
                    fontStyle: "italic",
                }}
            >
                Loading phrases...
            </div>
        );
    }

    if (phrases.length === 0) {
        return (
            <div
                style={{
                    padding: 16,
                    textAlign: "center",
                    color: "var(--muted)",
                    fontStyle: "italic",
                }}
            >
                No phrases found matching your criteria.
            </div>
        );
    }

    return (
        <div
            style={{
                padding: "8px 0",
                fontFamily: settings.font,
                fontSize: settings.fontSize,
            }}
        >
            {phrases.map((phrase) => (
                <PhraseCardExtended
                    key={phrase.id}
                    id={phrase.id}
                    phraseId={phrase.id}
                    text={phrase.text}
                    translation={phrase.translation}
                    explanation={phrase.explanation}
                    tags={phrase.tags}
                    sourceFile={phrase.sourceFile || phrase.source_file}
                    isTranslating={translatingPhrases.has(phrase.id)}
                    onEdit={onEdit}
                    onRemove={handleRemovePhrase}
                    onJumpToPhrase={handleJumpToPhrase}
                />
            ))}
        </div>
    );
};
