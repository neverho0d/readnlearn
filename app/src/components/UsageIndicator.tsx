/**
 * UsageIndicator Component
 *
 * Displays usage statistics for translation providers in the status bar.
 * Shows progress bar, percentage, and color-coded indicators.
 */

import React from "react";
import { UsageStats } from "../lib/usage/UsageTracker";

interface UsageIndicatorProps {
    provider: string;
    usage: UsageStats;
    showDetails?: boolean;
}

export const UsageIndicator: React.FC<UsageIndicatorProps> = ({
    provider,
    usage,
    showDetails = false,
}) => {
    const getColorClass = (percentage: number): string => {
        if (percentage >= 90) return "usage-red";
        if (percentage >= 70) return "usage-yellow";
        return "usage-green";
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + "M";
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + "k";
        }
        return num.toString();
    };

    const getProviderName = (provider: string): string => {
        switch (provider) {
            case "deepl":
                return "DeepL";
            case "google":
                return "Google";
            default:
                return provider;
        }
    };

    const colorClass = getColorClass(usage.percentage);

    if (showDetails) {
        return (
            <div className={`usage-indicator ${colorClass}`}>
                <div className="usage-header">
                    <span className="usage-provider">{getProviderName(provider)}</span>
                    <span className="usage-percentage">{usage.percentage.toFixed(1)}%</span>
                </div>
                <div className="usage-progress">
                    <div
                        className="usage-progress-bar"
                        style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                    />
                </div>
                <div className="usage-details">
                    <span className="usage-used">{formatNumber(usage.charactersUsed)}</span>
                    <span className="usage-separator">/</span>
                    <span className="usage-limit">{formatNumber(usage.limit)}</span>
                    <span className="usage-remaining">({formatNumber(usage.remaining)} left)</span>
                </div>
            </div>
        );
    }

    // Compact view for status bar
    return (
        <div
            className={`usage-indicator-compact ${colorClass}`}
            title={`${getProviderName(provider)}: ${usage.percentage.toFixed(1)}% (${formatNumber(usage.charactersUsed)}/${formatNumber(usage.limit)})`}
        >
            <span className="usage-provider">{getProviderName(provider)}</span>
            <span className="usage-percentage">{usage.percentage.toFixed(0)}%</span>
        </div>
    );
};

// CSS styles (to be added to App.css)
export const usageIndicatorStyles = `
.usage-indicator {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 6px;
    background: var(--panel);
    border: 1px solid var(--border-color);
    min-width: 200px;
}

.usage-indicator-compact {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 4px;
    background: var(--panel);
    border: 1px solid var(--border-color);
    font-size: 12px;
    cursor: pointer;
}

.usage-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
}

.usage-provider {
    font-size: 14px;
    font-weight: 600;
}

.usage-percentage {
    font-size: 14px;
    font-weight: 600;
}

.usage-progress {
    width: 100%;
    height: 6px;
    background: var(--border-color);
    border-radius: 3px;
    overflow: hidden;
}

.usage-progress-bar {
    height: 100%;
    transition: width 0.3s ease;
}

.usage-details {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);
}

.usage-separator {
    color: var(--text-secondary);
}

.usage-remaining {
    color: var(--text-secondary);
    font-size: 11px;
}

/* Color variants */
.usage-green .usage-progress-bar {
    background: #10b981;
}

.usage-yellow .usage-progress-bar {
    background: #f59e0b;
}

.usage-red .usage-progress-bar {
    background: #ef4444;
}

.usage-green {
    border-color: #10b981;
}

.usage-yellow {
    border-color: #f59e0b;
}

.usage-red {
    border-color: #ef4444;
}

.usage-green .usage-percentage {
    color: #10b981;
}

.usage-yellow .usage-percentage {
    color: #f59e0b;
}

.usage-red .usage-percentage {
    color: #ef4444;
}
`;
