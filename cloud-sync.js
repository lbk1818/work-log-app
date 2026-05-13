// Cloudflare Sync API 配置
const SYNC_CONFIG = {
    // Cloudflare Worker URL（已配置）
    apiEndpoint: 'https://work-log-sync.1349880215.workers.dev',
    
    // 用户标识（多设备共享同一个 ID）
    userId: 'work-log-user-001'
};

// 云端同步存储
const CloudStorage = {
    // 从云端获取日志
    async fetchLogs() {
        try {
            const response = await fetch(`${SYNC_CONFIG.apiEndpoint}/logs?userId=${SYNC_CONFIG.userId}`);
            if (!response.ok) throw new Error('网络错误');
            return await response.json();
        } catch (error) {
            console.error('从云端获取失败:', error);
            return [];
        }
    },
    
    // 上传日志到云端
    async uploadLog(log) {
        try {
            const response = await fetch(`${SYNC_CONFIG.apiEndpoint}/logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: SYNC_CONFIG.userId,
                    log: log
                })
            });
            if (!response.ok) throw new Error('上传失败');
            return true;
        } catch (error) {
            console.error('上传到云端失败:', error);
            return false;
        }
    },
    
    // 更新云端日志
    async updateLog(updatedLog) {
        try {
            const response = await fetch(`${SYNC_CONFIG.apiEndpoint}/logs`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: SYNC_CONFIG.userId,
                    log: updatedLog
                })
            });
            if (!response.ok) throw new Error('更新失败');
            return true;
        } catch (error) {
            console.error('更新云端日志失败:', error);
            return false;
        }
    },
    
    // 删除云端日志
    async deleteLog(logId) {
        try {
            const response = await fetch(`${SYNC_CONFIG.apiEndpoint}/logs/${logId}?userId=${SYNC_CONFIG.userId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('删除失败');
            return true;
        } catch (error) {
            console.error('删除云端日志失败:', error);
            return false;
        }
    },
    
    // 同步所有日志
    async syncAllLogs(logs) {
        try {
            const response = await fetch(`${SYNC_CONFIG.apiEndpoint}/logs/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: SYNC_CONFIG.userId,
                    logs: logs
                })
            });
            if (!response.ok) throw new Error('同步失败');
            return true;
        } catch (error) {
            console.error('同步所有日志失败:', error);
            return false;
        }
    }
};
