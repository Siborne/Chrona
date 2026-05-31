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

    /// Check if the given app_id should merge with the previous session.
    /// Returns the existing session_id to extend, or None if a new session is needed.
    pub fn should_merge(&self, app_id: i64, now: i64) -> Option<i64> {
        if let Some(last_app) = self.last_app_id {
            if last_app == app_id
                && (now - self.last_switch_time) < self.merge_interval_ms as i64
            {
                return self.active.as_ref().map(|a| a.session_id);
            }
        }
        None
    }

    /// Record a switch event (update last_app_id and last_switch_time).
    pub fn record_switch(&mut self, app_id: i64, now: i64) {
        self.last_app_id = Some(app_id);
        self.last_switch_time = now;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_session_when_no_active() {
        let m = SessionMerger::new(30);
        assert!(m.should_merge(1, 1000).is_none());
    }

    #[test]
    fn test_should_merge_within_interval() {
        let mut m = SessionMerger::new(30);
        m.set_active(ActiveSession { session_id: 1, app_id: 5, started_at: 0, title: None });
        m.record_switch(5, 0);
        assert!(m.should_merge(5, 29000).is_some());
    }

    #[test]
    fn test_should_not_merge_after_interval() {
        let mut m = SessionMerger::new(30);
        m.set_active(ActiveSession { session_id: 1, app_id: 5, started_at: 0, title: None });
        m.record_switch(5, 0);
        assert!(m.should_merge(5, 31000).is_none());
    }

    #[test]
    fn test_should_not_merge_different_app() {
        let mut m = SessionMerger::new(30);
        m.set_active(ActiveSession { session_id: 1, app_id: 5, started_at: 0, title: None });
        m.record_switch(5, 0);
        assert!(m.should_merge(6, 1000).is_none());
    }

    #[test]
    fn test_record_switch_updates_state() {
        let mut m = SessionMerger::new(30);
        m.record_switch(1, 100);
        assert_eq!(m.last_app_id, Some(1));
        assert_eq!(m.last_switch_time, 100);
        m.record_switch(2, 200);
        assert_eq!(m.last_app_id, Some(2));
        assert_eq!(m.last_switch_time, 200);
    }
}
