// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest;

// Generic provider proxies
#[tauri::command]
async fn openai_proxy(
    api_key: String,
    base_url: Option<String>,
    method: String,
    path: String,
    body: Option<String>,
) -> Result<String, String> {
    if api_key.is_empty() { return Err("Missing OpenAI API key".into()); }
    let base = base_url.unwrap_or_else(|| "https://api.openai.com".to_string());
    let url = format!("{}{}", base, path);
    
    // Create client with timeout
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let mut req = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "GET" => client.get(&url),
        "PUT" => client.put(&url),
        "PATCH" => client.patch(&url),
        "DELETE" => client.delete(&url),
        _ => return Err("Unsupported method".into()),
    }
    .bearer_auth(api_key)
    .header("Content-Type", "application/json");

    if let Some(b) = body { req = req.body(b); }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let text = resp.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn deepl_proxy(
    api_key: String,
    base_url: Option<String>,
    method: String,
    path: String,
    body: Option<String>,
) -> Result<String, String> {
    if api_key.is_empty() { return Err("Missing DeepL API key".into()); }
    let base = base_url.unwrap_or_else(|| "https://api-free.deepl.com".to_string());
    let url = format!("{}{}", base, path);
    
    // Create client with timeout
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let mut req = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "GET" => client.get(&url),
        "PUT" => client.put(&url),
        "PATCH" => client.patch(&url),
        "DELETE" => client.delete(&url),
        _ => return Err("Unsupported method".into()),
    }
    .header("Authorization", format!("DeepL-Auth-Key {}", api_key));

    if let Some(b) = body { req = req.header("Content-Type", "application/json").body(b); }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let text = resp.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn google_proxy(
    api_key: String,
    base_url: Option<String>,
    method: String,
    path: String,
    body: Option<String>,
) -> Result<String, String> {
    if api_key.is_empty() { return Err("Missing Google API key".into()); }
    let base = base_url.unwrap_or_else(|| "https://translation.googleapis.com".to_string());
    let sep = if path.contains('?') { "&" } else { "?" };
    let url = format!("{}{}{}key={}", base, path, sep, api_key);
    
    // Create client with timeout
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let mut req = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "GET" => client.get(&url),
        "PUT" => client.put(&url),
        "PATCH" => client.patch(&url),
        "DELETE" => client.delete(&url),
        _ => return Err("Unsupported method".into()),
    };

    if let Some(b) = body { req = req.header("Content-Type", "application/json").body(b); }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let text = resp.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            openai_proxy,
            deepl_proxy,
            google_proxy,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
