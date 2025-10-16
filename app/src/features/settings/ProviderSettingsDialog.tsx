import React from "react";
import { useSettings } from "../../lib/settings/SettingsContext";

interface ProviderSettingsDialogProps {
    onClose: () => void;
}

export const ProviderSettingsDialog: React.FC<ProviderSettingsDialogProps> = ({ onClose }) => {
    const { settings, updateSettings } = useSettings();
    const [form, setForm] = React.useState({
        openaiApiKey: settings.openaiApiKey || "",
        deeplApiKey: settings.deeplApiKey || "",
        googleApiKey: settings.googleApiKey || "",
        dailyCapOpenAI: settings.dailyCapOpenAI ?? 5,
        dailyCapDeepL: settings.dailyCapDeepL ?? 2,
        dailyCapGoogle: settings.dailyCapGoogle ?? 2,
    });
    const [showKeys, setShowKeys] = React.useState(false);

    const inputStyle: React.CSSProperties = {
        width: "100%",
        boxSizing: "border-box",
    };

    const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((p) => ({
            ...p,
            [k]: k.startsWith("dailyCap") ? Number(e.target.value) : e.target.value,
        }));

    const onSave = () => {
        updateSettings({
            openaiApiKey: form.openaiApiKey || undefined,
            deeplApiKey: form.deeplApiKey || undefined,
            googleApiKey: form.googleApiKey || undefined,
            dailyCapOpenAI: isFinite(form.dailyCapOpenAI) ? form.dailyCapOpenAI : undefined,
            dailyCapDeepL: isFinite(form.dailyCapDeepL) ? form.dailyCapDeepL : undefined,
            dailyCapGoogle: isFinite(form.dailyCapGoogle) ? form.dailyCapGoogle : undefined,
        });
        onClose();
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1001,
            }}
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "var(--panel)",
                    color: "var(--text)",
                    padding: 16,
                    borderRadius: 8,
                    minWidth: 420,
                    maxWidth: 560,
                    width: "90%",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
                }}
            >
                <h3 style={{ margin: "0 0 12px 0" }}>Provider Settings</h3>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <input
                        id="show-keys"
                        type="checkbox"
                        checked={showKeys}
                        onChange={(e) => setShowKeys(e.target.checked)}
                    />
                    <label htmlFor="show-keys">Show API keys</label>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                    <label>
                        OpenAI API Key
                        <input
                            type={showKeys ? "text" : "password"}
                            value={form.openaiApiKey}
                            onChange={update("openaiApiKey")}
                            style={inputStyle}
                            autoComplete="off"
                        />
                    </label>
                    <label>
                        DeepL API Key
                        <input
                            type={showKeys ? "text" : "password"}
                            value={form.deeplApiKey}
                            onChange={update("deeplApiKey")}
                            style={inputStyle}
                            autoComplete="off"
                        />
                    </label>
                    <label>
                        Google API Key
                        <input
                            type={showKeys ? "text" : "password"}
                            value={form.googleApiKey}
                            onChange={update("googleApiKey")}
                            style={inputStyle}
                            autoComplete="off"
                        />
                    </label>
                </div>

                <h4 style={{ margin: "16px 0 8px 0" }}>Daily Caps (USD)</h4>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
                    <label>
                        OpenAI
                        <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={form.dailyCapOpenAI}
                            onChange={update("dailyCapOpenAI")}
                            style={inputStyle}
                        />
                    </label>
                    <label>
                        DeepL
                        <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={form.dailyCapDeepL}
                            onChange={update("dailyCapDeepL")}
                            style={inputStyle}
                        />
                    </label>
                    <label>
                        Google
                        <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={form.dailyCapGoogle}
                            onChange={update("dailyCapGoogle")}
                            style={inputStyle}
                        />
                    </label>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={onSave}>Save</button>
                </div>
            </div>
        </div>
    );
};
