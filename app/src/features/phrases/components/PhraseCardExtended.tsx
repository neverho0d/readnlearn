/**
 * PhraseCardExtended Component
 *
 * Combines PhraseControl and PhraseCard for Dictionary mode.
 * Provides source file info, actions menu, and full phrase display.
 */

import React from "react";
import { PhraseCard, PhraseCardProps } from "./PhraseCard";
import { PhraseControl, PhraseControlProps } from "./PhraseControl";

export interface PhraseCardExtendedProps extends PhraseCardProps, PhraseControlProps {
    isTranslating?: boolean;
}

export const PhraseCardExtended: React.FC<PhraseCardExtendedProps> = ({
    onEdit,
    onRemove,
    onJumpToPhrase,
    isTranslating,
    ...phraseCardProps
}) => {
    return (
        <div
            style={{
                border: "none",
                borderRadius: 8,
                background: "var(--bg)",
                padding: 12,
                marginBottom: 8,
            }}
        >
            <PhraseControl
                phraseId={phraseCardProps.id}
                sourceFile={phraseCardProps.sourceFile}
                onEdit={onEdit}
                onRemove={onRemove}
            />
            <PhraseCard
                {...phraseCardProps}
                isTranslating={isTranslating}
                onJumpToPhrase={onJumpToPhrase}
            />
        </div>
    );
};
