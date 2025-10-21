/**
 * Study Stats Component
 *
 * Displays session statistics and progress information.
 * Shows completion status, accuracy, and time spent.
 */

import { StudySession } from "../../lib/srs/studySession";

export interface StudyStatsProps {
    session: StudySession | null;
    showDetailed?: boolean;
    compact?: boolean;
}

export interface StatItem {
    label: string;
    value: string | number;
    color?: string;
    icon?: string;
}

export function StudyStats({ session, showDetailed = true, compact = false }: StudyStatsProps) {
    if (!session) {
        return (
            <div
                style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                }}
            >
                No session data available
            </div>
        );
    }

    const progress =
        session.totalItems > 0 ? (session.completedItems / session.totalItems) * 100 : 0;
    const accuracy =
        session.completedItems > 0 ? (session.correctItems / session.completedItems) * 100 : 0;
    const timeSpent = formatDuration(session.durationSeconds);

    const stats: StatItem[] = [
        {
            label: "Progress",
            value: `${session.completedItems}/${session.totalItems}`,
            color: "var(--primary)",
            icon: "📊",
        },
        {
            label: "Accuracy",
            value: `${Math.round(accuracy)}%`,
            color:
                accuracy >= 80
                    ? "var(--success)"
                    : accuracy >= 60
                      ? "var(--warning)"
                      : "var(--error)",
            icon: "🎯",
        },
        {
            label: "Time",
            value: timeSpent,
            color: "var(--text-secondary)",
            icon: "⏱️",
        },
    ];

    if (showDetailed) {
        stats.push({
            label: "Average Grade",
            value: session.averageGrade.toFixed(1),
            color: getGradeColor(session.averageGrade),
            icon: "⭐",
        });
    }

    if (compact) {
        return (
            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "0.5rem",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                }}
            >
                {stats.map((stat, index) => (
                    <div key={index} style={{ textAlign: "center" }}>
                        <div style={{ color: stat.color, fontWeight: "bold" }}>{stat.value}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div
            style={{
                backgroundColor: "var(--bg-secondary)",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
            }}
        >
            {/* Progress bar */}
            <div style={{ marginBottom: "1rem" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                    }}
                >
                    <span style={{ fontWeight: "bold", color: "var(--text-primary)" }}>
                        Session Progress
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {Math.round(progress)}%
                    </span>
                </div>
                <div
                    style={{
                        width: "100%",
                        height: "8px",
                        backgroundColor: "var(--border-color)",
                        borderRadius: "4px",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: `${progress}%`,
                            height: "100%",
                            backgroundColor: "var(--primary)",
                            transition: "width 0.3s ease",
                        }}
                    />
                </div>
            </div>

            {/* Stats grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "1rem",
                }}
            >
                {stats.map((stat, index) => (
                    <div key={index} style={{ textAlign: "center" }}>
                        <div
                            style={{
                                fontSize: "1.5rem",
                                marginBottom: "0.25rem",
                            }}
                        >
                            {stat.icon}
                        </div>
                        <div
                            style={{
                                fontSize: "1.2rem",
                                fontWeight: "bold",
                                color: stat.color,
                                marginBottom: "0.25rem",
                            }}
                        >
                            {stat.value}
                        </div>
                        <div
                            style={{
                                fontSize: "0.8rem",
                                color: "var(--text-secondary)",
                            }}
                        >
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Session details */}
            {showDetailed && (
                <div
                    style={{
                        marginTop: "1rem",
                        padding: "0.75rem",
                        backgroundColor: "var(--bg-tertiary)",
                        borderRadius: "4px",
                        fontSize: "0.9rem",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: "0.5rem",
                        }}
                    >
                        <div>
                            <strong>Session Type:</strong> {session.sessionType}
                        </div>
                        <div>
                            <strong>Started:</strong> {formatTime(session.startedAt)}
                        </div>
                        {session.completedAt && (
                            <div>
                                <strong>Completed:</strong> {formatTime(session.completedAt)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Format duration in seconds to human readable format
 */
function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Format time to readable format
 */
function formatTime(date: Date): string {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Get color for grade
 */
function getGradeColor(grade: number): string {
    if (grade >= 3.5) return "var(--success)";
    if (grade >= 2.5) return "var(--warning)";
    if (grade >= 1.5) return "var(--error)";
    return "var(--text-secondary)";
}

/**
 * Session summary component
 */
export function SessionSummary({ session }: { session: StudySession }) {
    const accuracy =
        session.completedItems > 0 ? (session.correctItems / session.completedItems) * 100 : 0;
    const timeSpent = formatDuration(session.durationSeconds);

    return (
        <div
            style={{
                backgroundColor: "var(--bg-secondary)",
                padding: "1.5rem",
                borderRadius: "8px",
                textAlign: "center",
            }}
        >
            <h3 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>
                Session Complete!
            </h3>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "1rem",
                    marginBottom: "1rem",
                }}
            >
                <div>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary)" }}>
                        {session.completedItems}
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>Items Completed</div>
                </div>

                <div>
                    <div
                        style={{
                            fontSize: "2rem",
                            fontWeight: "bold",
                            color: accuracy >= 80 ? "var(--success)" : "var(--warning)",
                        }}
                    >
                        {Math.round(accuracy)}%
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>Accuracy</div>
                </div>

                <div>
                    <div
                        style={{
                            fontSize: "2rem",
                            fontWeight: "bold",
                            color: "var(--text-primary)",
                        }}
                    >
                        {timeSpent}
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>Time Spent</div>
                </div>
            </div>

            <div
                style={{
                    padding: "1rem",
                    backgroundColor: "var(--info-bg)",
                    borderRadius: "4px",
                    border: "1px solid var(--info)",
                    fontSize: "0.9rem",
                    color: "var(--info-text)",
                }}
            >
                <strong>Great job!</strong> You've completed {session.completedItems} items with{" "}
                {Math.round(accuracy)}% accuracy. Keep up the good work!
            </div>
        </div>
    );
}
