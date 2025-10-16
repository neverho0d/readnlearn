/**
 * Language Detection Utilities
 *
 * This module provides automatic language detection using AI providers
 * to identify the language of loaded text content.
 */

import { DeepLDriver } from "../../adapters/mt/DeepLDriver";
import { GoogleDriver } from "../../adapters/mt/GoogleDriver";
import { useSettings } from "../settings/SettingsContext";
import OpenAI from "openai";
import { invoke as tauriInvoke, isTauri as tauriIsTauri } from "@tauri-apps/api/core";
import { costController } from "../settings/costControls";

export interface LanguageDetectionResult {
    language: string;
    languageCode: string;
    confidence: number;
    method: "openai" | "deepl" | "google" | "fallback";
}

export interface LanguageDetectionOptions {
    text: string;
    sampleSize?: number; // Number of characters to analyze (default: 1000)
    preferredProvider?: "openai" | "deepl" | "google";
}

export const SUPPORTED_LANGS = ["en", "es", "fr", "de", "it", "pt"] as const;
export type SupportedLangCode = (typeof SUPPORTED_LANGS)[number];

function normalizeToSupported(code: string | undefined): SupportedLangCode | "en" {
    if (!code) return "en";
    const c = code.toLowerCase();
    return (SUPPORTED_LANGS as readonly string[]).includes(c) ? (c as SupportedLangCode) : "en";
}

function englishFallback(): LanguageDetectionResult {
    return { language: "English", languageCode: "en", confidence: 0.5, method: "fallback" };
}

// Strong heuristic for 6 languages (ASCII-friendly; accents handled)
function heuristicDetectSix(text: string): LanguageDetectionResult {
    const sample = text.slice(0, 4000).toLowerCase();

    // Quick script checks (just in case)
    if (/\p{Script=Han}/u.test(sample)) {
        return { language: "English", languageCode: "en", confidence: 0.3, method: "fallback" };
    }

    const score = {
        en: 0,
        es: 0,
        fr: 0,
        de: 0,
        it: 0,
        pt: 0,
    } as Record<SupportedLangCode, number>;

    const bump = (code: SupportedLangCode, amt: number) => (score[code] += amt);

    // Function words (stopwords) signals
    const patterns: Array<[SupportedLangCode, RegExp, number]> = [
        ["en", /\b(the|and|of|to|in|is|that|with|as|for|on|was|are|be|at|by)\b/g, 1],
        ["es", /\b(el|la|de|que|y|en|un|una|es|con|por|para|del|los|las|al)\b/g, 1],
        ["fr", /\b(le|la|de|que|et|en|un|une|est|avec|pour|des|les|aux|du)\b/g, 1],
        ["de", /\b(der|die|das|und|in|zu|den|von|mit|ist|ein|eine|des|dem|auf)\b/g, 1],
        ["it", /\b(il|la|di|che|e|in|un|una|è|con|per|del|lo|gli|le|dei)\b/g, 1],
        ["pt", /\b(o|a|de|que|e|em|um|uma|é|com|por|para|dos|das|ao|à)\b/g, 1],
    ];

    for (const [code, re, amt] of patterns) {
        const matches = sample.match(re);
        if (matches) bump(code, matches.length * amt);
    }

    // Diacritics unique-ish hints
    if (/[ñ¡¿]/.test(sample)) bump("es", 2);
    if (/[çàâæçéèêëîïôœùûüÿ]/.test(sample)) bump("fr", 2);
    if (/[äöüß]/.test(sample)) bump("de", 2);
    if (/[àèéìíîòóùú]/.test(sample)) bump("it", 1);
    if (/[ãõçáéíóú]/.test(sample)) bump("pt", 2);

    // Common bigrams/trigrams
    const contains = (s: string) => sample.includes(s);
    if (contains(" the ") || contains(" and ")) bump("en", 2);
    if (contains(" de la ") || contains(" que ")) bump("fr", 1);
    if (contains(" de los ") || contains(" del ") || contains(" que ")) bump("es", 1);
    if (contains(" und ") || contains(" der ") || contains(" die ")) bump("de", 1);
    if (contains(" del ") || contains(" che ")) bump("it", 1);
    if (contains(" dos ") || contains(" das ") || contains(" que ")) bump("pt", 1);

    // Decide
    const entries = Object.entries(score) as Array<[SupportedLangCode, number]>;
    entries.sort((a, b) => b[1] - a[1]);
    const [best, bestScore] = entries[0];
    const second = entries[1]?.[1] ?? 0;

    if (bestScore === 0) return englishFallback();

    const confidence = Math.min(0.95, 0.5 + (bestScore - second) / Math.max(8, bestScore));
    const nameMap: Record<SupportedLangCode, string> = {
        en: "English",
        es: "Spanish",
        fr: "French",
        de: "German",
        it: "Italian",
        pt: "Portuguese",
    };
    return { language: nameMap[best], languageCode: best, confidence, method: "fallback" };
}

/**
 * Language detection using OpenAI
 */
async function detectWithOpenAI(
    text: string,
    config: { apiKey: string; baseUrl?: string },
): Promise<LanguageDetectionResult> {
    // Use OpenAI client directly for a tiny detection prompt
    const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });

    const prompt = `Identify the language of the text. Reply exactly as one of:
English (en) | Spanish (es) | French (fr) | German (de) | Italian (it) | Portuguese (pt)
Text:\n${text.slice(0, 1200)}`;

    try {
        const resp = await client.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You return only '<Name> (<code>)' from the allowed list.",
                },
                { role: "user", content: prompt },
            ],
            temperature: 0,
            max_tokens: 12,
        });
        // console.log("OpenAI response:", resp);
        const content = resp.choices[0]?.message?.content || "";
        const match = content.match(
            /(English|Spanish|French|German|Italian|Portuguese)\s*\((en|es|fr|de|it|pt)\)/i,
        );
        if (match) {
            const code = normalizeToSupported(match[2]);
            const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
            return { language: name, languageCode: code, confidence: 0.95, method: "openai" };
        }
        return englishFallback();
    } catch (error) {
        throw new Error(`OpenAI language detection failed: ${error}`);
    }
}

/**
 * Language detection using DeepL
 */
async function detectWithDeepL(
    text: string,
    config: { apiKey: string; baseUrl?: string },
): Promise<LanguageDetectionResult> {
    const driver = new DeepLDriver(config);

    type MinimalMTResponse = { metadata?: { detectedLanguage?: string } } | unknown;

    try {
        // DeepL can detect source language automatically
        const response = (await driver.translate(text, "auto", "en")) as MinimalMTResponse;
        // console.log("DeepL response:", response);

        // DeepL returns the detected source language in metadata
        const detectedLang =
            (response as { metadata?: { detectedLanguage?: string } }).metadata?.detectedLanguage ||
            "unknown";

        // Restrict to supported 6 languages
        const code = normalizeToSupported(detectedLang.toLowerCase());
        const nameMap: Record<SupportedLangCode, string> = {
            en: "English",
            es: "Spanish",
            fr: "French",
            de: "German",
            it: "Italian",
            pt: "Portuguese",
        };

        return {
            language: nameMap[code],
            languageCode: code,
            confidence: 0.95,
            method: "deepl",
        };
    } catch (error) {
        throw new Error(`DeepL language detection failed: ${error}`);
    }
}

/**
 * Language detection using Google Translate
 */
async function detectWithGoogle(
    text: string,
    config: { apiKey: string; baseUrl?: string },
): Promise<LanguageDetectionResult> {
    const driver = new GoogleDriver(config);

    type MinimalMTResponse = { metadata?: { detectedLanguage?: string } } | unknown;

    try {
        // Google Translate can detect source language automatically
        const response = (await driver.translate(text, "auto", "en")) as MinimalMTResponse;
        // console.log("Google response:", response);

        // Google returns the detected source language in metadata
        const detectedLang =
            (response as { metadata?: { detectedLanguage?: string } }).metadata?.detectedLanguage ||
            "unknown";

        // Restrict to supported 6 languages
        const code = normalizeToSupported(detectedLang.toLowerCase());
        const nameMap: Record<SupportedLangCode, string> = {
            en: "English",
            es: "Spanish",
            fr: "French",
            de: "German",
            it: "Italian",
            pt: "Portuguese",
        };

        return {
            language: nameMap[code],
            languageCode: code,
            confidence: 0.9,
            method: "google",
        };
    } catch (error) {
        throw new Error(`Google language detection failed: ${error}`);
    }
}

// (Old detectWithFallback removed in favor of heuristicDetectSix)

// Determine if provider calls are allowed in this environment
function providersAllowed(): boolean {
    // Allow in Tauri; allow in browser only if explicitly enabled
    try {
        const isTauri = isTauriRuntime();
        if (isTauri) return true;
        const env = (import.meta as { env?: Record<string, string> }).env || {};
        return env.VITE_ALLOW_BROWSER_PROVIDERS === "true";
    } catch {
        return false;
    }
}

function isTauriRuntime(): boolean {
    try {
        // Prefer official runtime check from Tauri v2 API
        return Boolean(tauriIsTauri());
    } catch {
        return false;
    }
}

// Minimal helper to invoke Tauri commands in a typed way
async function invokeTauri<TResponse>(
    cmd: string,
    payload: Record<string, unknown>,
): Promise<TResponse> {
    return (await tauriInvoke(cmd, payload)) as TResponse;
}

// Hook-friendly accessor that reads keys from settings context
export function useProviderConfigsFromSettings() {
    const { settings } = useSettings();
    return {
        openai: {
            apiKey: settings.openaiApiKey || "",
            baseUrl: settings.openaiBaseUrl || undefined,
        },
        deepl: {
            apiKey: settings.deeplApiKey || "",
            baseUrl: settings.deeplBaseUrl || undefined,
        },
        google: {
            apiKey: settings.googleApiKey || "",
            baseUrl: settings.googleBaseUrl || undefined,
        },
    };
}

// Non-hook fallback for non-React contexts (kept for compatibility with prior call sites)
async function getProviderConfigs() {
    type ViteEnv = { [key: string]: unknown } & {
        VITE_OPENAI_API_KEY?: string;
        VITE_OPENAI_BASE_URL?: string;
        VITE_DEEPL_API_KEY?: string;
        VITE_DEEPL_BASE_URL?: string;
        VITE_GOOGLE_API_KEY?: string;
        VITE_GOOGLE_BASE_URL?: string;
    };
    const env = (import.meta as { env?: ViteEnv })?.env || ({} as ViteEnv);

    // Read saved settings from localStorage (keys only; URLs are not user-provided)
    let saved: Partial<{
        openaiApiKey: string;
        deeplApiKey: string;
        googleApiKey: string;
    }> = {};
    try {
        const raw = localStorage.getItem("readnlearn-settings");
        if (raw) {
            const parsed = JSON.parse(raw);
            saved = {
                openaiApiKey: parsed.openaiApiKey,
                deeplApiKey: parsed.deeplApiKey,
                googleApiKey: parsed.googleApiKey,
            };
        }
    } catch {
        // ignore
    }

    // Hardcoded defaults for provider base URLs (env can override)
    const defaultOpenAIBase = undefined; // SDK default
    const defaultDeepLBase = "https://api-free.deepl.com"; // can be overridden via env
    const defaultGoogleBase = "https://translation.googleapis.com";

    const openai = {
        apiKey: saved.openaiApiKey || env.VITE_OPENAI_API_KEY || "",
        baseUrl: (env.VITE_OPENAI_BASE_URL as string | undefined) || defaultOpenAIBase,
    } as { apiKey: string; baseUrl?: string };
    const deepl = {
        apiKey: saved.deeplApiKey || env.VITE_DEEPL_API_KEY || "",
        baseUrl: (env.VITE_DEEPL_BASE_URL as string | undefined) || defaultDeepLBase,
    } as { apiKey: string; baseUrl?: string };
    const google = {
        apiKey: saved.googleApiKey || env.VITE_GOOGLE_API_KEY || "",
        baseUrl: (env.VITE_GOOGLE_BASE_URL as string | undefined) || defaultGoogleBase,
    } as { apiKey: string; baseUrl?: string };

    // console.log("Provider configs:", { openai, deepl, google });
    return { openai, deepl, google };
}

async function detectWithOpenAIProxy(
    sampleText: string,
    cfg: { apiKey?: string; baseUrl?: string },
): Promise<LanguageDetectionResult> {
    if (!cfg.apiKey) throw new Error("OpenAI key missing");
    const body = JSON.stringify({
        model: "gpt-5-nano",
        messages: [
            {
                role: "system",
                content:
                    "You are a language detection expert. Respond ONLY as 'LanguageName (code)' from: English (en), Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt).",
            },
            {
                role: "user",
                content: `Identify the language of this text:\n${sampleText.slice(0, 1200)}`,
            },
        ],
        temperature: 0,
        max_tokens: 20,
    });
    const raw = await invokeTauri<string>("openai_proxy", {
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        method: "POST",
        path: "/v1/chat/completions",
        body,
    });
    try {
        const json = JSON.parse(raw);
        const content: string = json?.choices?.[0]?.message?.content ?? "";
        const match = content.match(
            /(English|Spanish|French|German|Italian|Portuguese)\s*\((en|es|fr|de|it|pt)\)/i,
        );
        if (match) {
            const name = match[1];
            const code = match[2].toLowerCase();
            return {
                language: name,
                languageCode: normalizeToSupported(code),
                confidence: 0.95,
                method: "openai",
            };
        }
        throw new Error("OpenAI parse failed");
    } catch (e) {
        throw new Error(`OpenAI proxy error: ${String(e)}; raw=${raw.slice(0, 400)}`);
    }
}

async function detectWithGoogleProxy(
    sampleText: string,
    cfg: { apiKey?: string; baseUrl?: string },
): Promise<LanguageDetectionResult> {
    if (!cfg.apiKey) throw new Error("Google key missing");
    const body = JSON.stringify({ q: sampleText.slice(0, 1200), target: "en" });
    const raw = await invokeTauri<string>("google_proxy", {
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        method: "POST",
        path: "/language/translate/v2",
        body,
    });
    const json = JSON.parse(raw);
    const detected: string =
        json?.data?.translations?.[0]?.detectedSourceLanguage?.toLowerCase?.() ?? "en";
    const code = normalizeToSupported(detected as string);
    const name =
        code === "es"
            ? "Spanish"
            : code === "fr"
              ? "French"
              : code === "de"
                ? "German"
                : code === "it"
                  ? "Italian"
                  : code === "pt"
                    ? "Portuguese"
                    : "English";
    return { language: name, languageCode: code, confidence: 0.9, method: "google" };
}

async function detectWithDeepLProxy(
    sampleText: string,
    cfg: { apiKey?: string; baseUrl?: string },
): Promise<LanguageDetectionResult> {
    if (!cfg.apiKey) throw new Error("DeepL key missing");
    // DeepL translate to EN and use detected_source_language
    const payload = { text: [sampleText.slice(0, 1200)], target_lang: "EN" };
    const raw = await invokeTauri<string>("deepl_proxy", {
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        method: "POST",
        path: "/v2/translate",
        body: JSON.stringify(payload),
    });
    const json = JSON.parse(raw);
    const detected: string =
        json?.translations?.[0]?.detected_source_language?.toUpperCase?.() ?? "EN";
    const map: Record<string, string> = { ES: "es", FR: "fr", DE: "de", IT: "it", PT: "pt" };
    const code = normalizeToSupported(map[detected] || "en");
    const name =
        code === "es"
            ? "Spanish"
            : code === "fr"
              ? "French"
              : code === "de"
                ? "German"
                : code === "it"
                  ? "Italian"
                  : code === "pt"
                    ? "Portuguese"
                    : "English";
    return { language: name, languageCode: code, confidence: 0.9, method: "deepl" };
}

/**
 * Main language detection function
 */
export async function detectLanguage(
    options: LanguageDetectionOptions,
): Promise<LanguageDetectionResult> {
    const { text, sampleSize = 800, preferredProvider } = options;
    const sampleText = text.slice(0, sampleSize);

    const configs = await getProviderConfigs();

    // Try providers first when allowed
    if (providersAllowed()) {
        const isTauri = isTauriRuntime();
        // Cheapest-first for language detection: Google (~$0.02/1K chars), DeepL (~$0.02/1K chars + plan), OpenAI tokens
        const providers = preferredProvider ? [preferredProvider] : ["google", "deepl", "openai"];
        for (const provider of providers) {
            // console.log("provider", provider);
            try {
                if (isTauri) {
                    if (provider === "google" && configs.google.apiKey) {
                        // Enforce caps (estimate by characters)
                        const estCost = costController.calculateCostDetailed({
                            provider: "google",
                            characters: sampleText.length,
                        });
                        const allowed = await costController.checkUsage("google", estCost, 0);
                        if (!allowed.allowed) {
                            console.warn("Cost blocked (google):", allowed.reason);
                        } else {
                            const res = await detectWithGoogleProxy(sampleText, configs.google);
                            await costController.recordUsage(
                                "google",
                                "detect_language",
                                0,
                                estCost,
                            );
                            res.languageCode = normalizeToSupported(res.languageCode);
                            return res;
                        }
                    }
                    if (provider === "deepl" && configs.deepl.apiKey) {
                        const estCost = costController.calculateCostDetailed({
                            provider: "deepl",
                            characters: sampleText.length,
                        });
                        const allowed = await costController.checkUsage("deepl", estCost, 0);
                        if (!allowed.allowed) {
                            console.warn("Cost blocked (deepl):", allowed.reason);
                        } else {
                            const res = await detectWithDeepLProxy(sampleText, configs.deepl);
                            await costController.recordUsage(
                                "deepl",
                                "detect_language",
                                0,
                                estCost,
                            );
                            res.languageCode = normalizeToSupported(res.languageCode);
                            return res;
                        }
                    }
                    if (provider === "openai" && configs.openai.apiKey) {
                        // Rough estimate: tokens ~ chars/4
                        const tokens = Math.ceil(sampleText.length / 4);
                        const estCost = costController.calculateEstimatedCost(
                            "openai",
                            tokens,
                            "gpt-5-nano",
                        );
                        const allowed = await costController.checkUsage("openai", estCost, tokens);
                        if (!allowed.allowed) {
                            console.warn("Cost blocked (openai):", allowed.reason);
                        } else {
                            const res = await detectWithOpenAIProxy(sampleText, configs.openai);
                            await costController.recordUsage(
                                "openai",
                                "chat.completions:gpt-5-nano",
                                tokens,
                                estCost,
                            );
                            res.languageCode = normalizeToSupported(res.languageCode);
                            return res;
                        }
                    }
                } else {
                    if (provider === "openai" && configs.openai.apiKey) {
                        const res = await detectWithOpenAI(sampleText, configs.openai);
                        res.languageCode = normalizeToSupported(res.languageCode);
                        return res;
                    }
                    if (provider === "deepl" && configs.deepl.apiKey) {
                        const res = await detectWithDeepL(sampleText, configs.deepl);
                        res.languageCode = normalizeToSupported(res.languageCode);
                        return res;
                    }
                    if (provider === "google" && configs.google.apiKey) {
                        const res = await detectWithGoogle(sampleText, configs.google);
                        res.languageCode = normalizeToSupported(res.languageCode);
                        return res;
                    }
                }
            } catch (error) {
                console.log("error", error);
                // continue to next provider
            }
        }
    }

    // Robust heuristic fallback
    return heuristicDetectSix(sampleText);
}

/**
 * Get language name in the specified UI language
 */
export function getLanguageNameInUI(languageCode: string, uiLanguage: string): string {
    const languageNames: Record<string, Record<string, string>> = {
        en: {
            es: "Spanish",
            en: "English",
            fr: "French",
            de: "German",
            it: "Italian",
            pt: "Portuguese",
            ru: "Russian",
            zh: "Chinese",
            ja: "Japanese",
            ko: "Korean",
            nl: "Dutch",
            pl: "Polish",
            sv: "Swedish",
            da: "Danish",
            no: "Norwegian",
            fi: "Finnish",
        },
        es: {
            es: "Español",
            en: "Inglés",
            fr: "Francés",
            de: "Alemán",
            it: "Italiano",
            pt: "Portugués",
            ru: "Ruso",
            zh: "Chino",
            ja: "Japonés",
            ko: "Coreano",
            nl: "Holandés",
            pl: "Polaco",
            sv: "Sueco",
            da: "Danés",
            no: "Noruego",
            fi: "Finlandés",
        },
        fr: {
            es: "Espagnol",
            en: "Anglais",
            fr: "Français",
            de: "Allemand",
            it: "Italien",
            pt: "Portugais",
            ru: "Russe",
            zh: "Chinois",
            ja: "Japonais",
            ko: "Coréen",
            nl: "Néerlandais",
            pl: "Polonais",
            sv: "Suédois",
            da: "Danois",
            no: "Norvégien",
            fi: "Finnois",
        },
        de: {
            es: "Spanisch",
            en: "Englisch",
            fr: "Französisch",
            de: "Deutsch",
            it: "Italienisch",
            pt: "Portugiesisch",
            ru: "Russisch",
            zh: "Chinesisch",
            ja: "Japanisch",
            ko: "Koreanisch",
            nl: "Niederländisch",
            pl: "Polnisch",
            sv: "Schwedisch",
            da: "Dänisch",
            no: "Norwegisch",
            fi: "Finnisch",
        },
    };

    return languageNames[uiLanguage]?.[languageCode] || languageCode;
}
