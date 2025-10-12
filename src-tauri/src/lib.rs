// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::collections::HashMap;
use std::sync::Mutex;
use lazy_static::lazy_static;

// In-memory credential storage (in production, use proper keyring)
lazy_static! {
    static ref CREDENTIALS: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn store_credential(service: String, key: String, value: String) -> Result<(), String> {
    let mut credentials = CREDENTIALS.lock().map_err(|e| e.to_string())?;
    let full_key = format!("{}:{}", service, key);
    credentials.insert(full_key, value);
    Ok(())
}

#[tauri::command]
fn get_credential(service: String, key: String) -> Result<Option<String>, String> {
    let credentials = CREDENTIALS.lock().map_err(|e| e.to_string())?;
    let full_key = format!("{}:{}", service, key);
    Ok(credentials.get(&full_key).cloned())
}

#[tauri::command]
fn delete_credential(service: String, key: String) -> Result<(), String> {
    let mut credentials = CREDENTIALS.lock().map_err(|e| e.to_string())?;
    let full_key = format!("{}:{}", service, key);
    credentials.remove(&full_key);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![greet, store_credential, get_credential, delete_credential])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
