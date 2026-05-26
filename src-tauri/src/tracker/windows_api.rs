use std::mem;
use windows::Win32::Foundation::{HWND, CloseHandle};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};
use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_NAME_FORMAT};
use windows::Win32::System::SystemInformation::GetTickCount;
use windows::core::PWSTR;

pub struct ForegroundInfo {
    pub exe_path: String,
    pub exe_name: String,
    pub window_title: Option<String>,
}

pub fn get_foreground_info() -> Option<ForegroundInfo> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return None;
        }

        let title = get_window_title(hwnd);
        let (exe_path, exe_name) = get_process_info(pid)?;

        Some(ForegroundInfo {
            exe_path,
            exe_name,
            window_title: title,
        })
    }
}

unsafe fn get_window_title(hwnd: HWND) -> Option<String> {
    let mut buf = [0u16; 512];
    let len = GetWindowTextW(hwnd, &mut buf);
    if len > 0 {
        Some(String::from_utf16_lossy(&buf[..len as usize]))
    } else {
        None
    }
}

unsafe fn get_process_info(pid: u32) -> Option<(String, String)> {
    let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;

    let mut buf = [0u16; 260];
    let mut size = buf.len() as u32;
    let pwstr = PWSTR(buf.as_mut_ptr());
    let result = QueryFullProcessImageNameW(handle, PROCESS_NAME_FORMAT(0), pwstr, &mut size);

    CloseHandle(handle).ok();

    result.ok()?;
    let path = String::from_utf16_lossy(&buf[..size as usize]);
    let exe_name = std::path::Path::new(&path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();
    Some((path, exe_name))
}

pub fn is_idle(threshold_secs: u64) -> bool {
    unsafe {
        // LASTINPUTINFO is in Win32_UI_WindowsAndMessaging but accessed via raw struct
        #[repr(C)]
        struct LASTINPUTINFO {
            cb_size: u32,
            dw_time: u32,
        }
        #[link(name = "user32")]
        extern "system" {
            fn GetLastInputInfo(plii: *mut LASTINPUTINFO) -> i32;
        }

        let mut info = LASTINPUTINFO {
            cb_size: mem::size_of::<LASTINPUTINFO>() as u32,
            dw_time: 0,
        };
        if GetLastInputInfo(&mut info) != 0 {
            let tick = GetTickCount();
            let idle_ms = tick.wrapping_sub(info.dw_time) as u64;
            idle_ms / 1000 >= threshold_secs
        } else {
            false
        }
    }
}
