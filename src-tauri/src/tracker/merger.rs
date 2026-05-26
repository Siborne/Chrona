pub struct ActiveSession {
    pub session_id: i64,
    pub app_id: i64,
    pub started_at: i64,
    pub title: Option<String>,
}

pub struct SessionMerger {
    pub active: Option<ActiveSession>,
    merge_interval_ms: u64,
    last_switch_time: i64,
    last_app_id: Option<i64>,
}

impl SessionMerger {
    pub fn new(merge_interval_secs: u64) -> Self {
        Self {
            active: None,
            merge_interval_ms: merge_interval_secs * 1000,
            last_switch_time: 0,
            last_app_id: None,
        }
    }

    pub fn set_active(&mut self, session: ActiveSession) {
        let now = session.started_at;
        let app_id = session.app_id;

        if let (Some(last_app), Some(active)) = (self.last_app_id, &self.active) {
            if last_app == app_id
                && (now - self.last_switch_time) < self.merge_interval_ms as i64
            {
                self.active = Some(ActiveSession {
                    session_id: active.session_id,
                    app_id: active.app_id,
                    started_at: active.started_at,
                    title: active.title.clone(),
                });
                self.last_switch_time = now;
                return;
            }
        }

        self.last_app_id = Some(app_id);
        self.last_switch_time = now;
        self.active = Some(session);
    }
}
