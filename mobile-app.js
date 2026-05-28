// 数据存储 - 支持多用户 Supabase 云端存储
const Storage = {
    localCache: [],
    isInitialized: false,

    // 初始化：加载用户数据
    async init() {
        try {
            // 如果没有登录，不加载数据
            if (!UserAuth.isLoggedIn()) {
                this.localCache = [];
                this.isInitialized = true;
                return false;
            }

            const userId = UserAuth.getUserId();
            
            // 从 Supabase 获取数据
            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/logs?user_id=eq.${userId}&order=date.desc,created_at.desc`, {
                headers: {
                    'apikey': SUPABASE_CONFIG.key,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
                }
            });
            
            const logs = await response.json();
            
            if (logs && Array.isArray(logs)) {
                this.localCache = logs.map(log => ({
                    id: log.id,
                    date: log.date,
                    mainWork: log.main_work || '',
                    thoughts: log.thoughts || '',
                    problems: log.problems || '',
                    createdAt: new Date(log.created_at).getTime()
                }));
                this.isInitialized = true;
                console.log('初始化完成，用户数据量:', this.localCache.length);
                return true;
            } else {
                this.localCache = [];
                this.isInitialized = true;
                return false;
            }
        } catch (error) {
            console.error('初始化失败:', error);
            this.localCache = [];
            this.isInitialized = true;
            return false;
        }
    },

    getLogs() {
        return this.localCache;
    },

    // 保存到 Supabase（逐条更新，避免数据丢失）
    async saveToSupabase() {
        if (!UserAuth.isLoggedIn()) return;
        
        const userId = UserAuth.getUserId();
        
        try {
            // 逐条插入或更新日志（使用 upsert）
            if (this.localCache.length > 0) {
                const logsData = this.localCache.map(log => ({
                    id: log.id,
                    user_id: userId,
                    date: log.date,
                    main_work: log.mainWork || '',
                    thoughts: log.thoughts || '',
                    problems: log.problems || '',
                    created_at: new Date(log.createdAt).toISOString(),
                    updated_at: log.updatedAt ? new Date(log.updatedAt).toISOString() : new Date().toISOString()
                }));
                
                // 使用 upsert 模式：存在则更新，不存在则插入
                await fetch(`${SUPABASE_CONFIG.url}/rest/v1/logs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_CONFIG.key,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
                        'Prefer': 'resolution=merge-duplicates'  // upsert 模式
                    },
                    body: JSON.stringify(logsData)
                });
            }
        } catch (error) {
            console.error('保存到 Supabase 失败:', error);
        }
    },

    async saveLog(log) {
        this.localCache.unshift(log);
        await this.saveToSupabase();
    },

    async updateLog(updatedLog) {
        const index = this.localCache.findIndex(log => log.id === updatedLog.id);
        if (index !== -1) {
            this.localCache[index] = updatedLog;
            await this.saveToSupabase();
        }
    },

    async deleteLog(id) {
        this.localCache = this.localCache.filter(log => log.id !== id);
        await this.saveToSupabase();
    },

    // 从 Supabase 刷新数据
    async refreshFromCloud() {
        if (!UserAuth.isLoggedIn()) return;
        
        await this.init();
        console.log('刷新成功，数据量:', this.localCache.length);
    }
};

// 工具函数
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

function autoNumber(textarea) {
    const lines = textarea.value.split('\n');
    const numberedLines = lines.map((line, index) => {
        if (/^\d+[\.、]/.test(line.trim())) {
            return line;
        }
        if (line.trim()) {
            return `${index + 1}. ${line.trim()}`;
        }
        return line;
    });
    
    const newValue = numberedLines.join('\n');
    if (newValue !== textarea.value) {
        const cursorPos = textarea.selectionStart;
        const oldLength = textarea.value.length;
        textarea.value = newValue;
        const newLength = textarea.value.length;
        textarea.setSelectionRange(cursorPos + (newLength - oldLength), cursorPos + (newLength - oldLength));
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// 页面切换
let currentPage = 'add';
let editingLogId = null; // 当前正在编辑的日志ID

function switchTab(page) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));

    // 显示选中页面
    document.getElementById(`${page}-page`).classList.remove('hidden');

    // 激活对应的 tab 按钮
    const tabButtons = document.querySelectorAll('.tab-item');
    const tabMap = { 'add': 0, 'list': 1, 'stats': 2 };
    if (tabButtons[tabMap[page]]) {
        tabButtons[tabMap[page]].classList.add('active');
    }
    
    currentPage = page;
    
    // 刷新数据
    if (page === 'list') {
        renderLogs();
    } else if (page === 'stats') {
        renderStats();
    }
}

// 保存日志
function saveLog() {
    const logDate = document.getElementById('log-date').value; // 使用选择的日期
    const mainWork = document.getElementById('main-work').value.trim();
    const thoughts = document.getElementById('thoughts').value.trim();
    const problems = document.getElementById('problems').value.trim();
    
    if (!logDate) {
        showToast('⚠️ 请选择日志日期');
        return;
    }
    
    if (!mainWork && !thoughts && !problems) {
        showToast('⚠️ 请至少填写一项内容');
        return;
    }
    
    if (editingLogId) {
        // 编辑模式：更新现有日志
        const originalLog = Storage.getLogs().find(l => l.id === editingLogId);
        const updatedLog = {
            id: editingLogId,
            date: logDate,
            mainWork: mainWork,
            thoughts: thoughts,
            problems: problems,
            createdAt: originalLog ? originalLog.createdAt : Date.now(),
            updatedAt: Date.now()
        };
        
        Storage.updateLog(updatedLog);
        showToast('✅ 日志已更新');
        editingLogId = null;
        
        // 重置表单标题和按钮
        document.querySelector('#add-page .card h3').textContent = '✏️ 添加工作日志';
        document.querySelector('#add-page .btn-primary').textContent = '💾 保存日志';
    } else {
        // 新增模式：创建新日志
        const newLog = {
            id: generateId(),
            date: logDate,
            mainWork: mainWork,
            thoughts: thoughts,
            problems: problems,
            createdAt: Date.now()
        };
        
        Storage.saveLog(newLog);
        showToast('✅ 日志已保存');
    }
    
    clearForm();
    
    // 自动切换到查看页面
    setTimeout(() => {
        document.querySelectorAll('.tab-item')[1].click();
    }, 500);
}

// 获取本地日期（YYYY-MM-DD 格式）
function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 清空表单
function clearForm() {
    document.getElementById('log-date').value = getLocalDate();
    document.getElementById('main-work').value = '';
    document.getElementById('thoughts').value = '';
    document.getElementById('problems').value = '';
    editingLogId = null;
    
    // 重置表单标题和按钮
    const formTitle = document.querySelector('#add-page .card h3');
    if (formTitle) {
        formTitle.textContent = '✏️ 添加工作日志';
    }
    const submitBtn = document.querySelector('#add-page .btn-primary');
    if (submitBtn) {
        submitBtn.textContent = '💾 保存日志';
    }
}

// 渲染日志列表
function renderLogs() {
    const logs = Storage.getLogs();
    
    // 按日期降序排序（最新的在前）
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const logListDiv = document.getElementById('log-list');
    
    if (logs.length === 0) {
        logListDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>暂无工作日志</p>
                <p style="font-size: 0.9rem; margin-top: 8px;">点击底部"记录"开始添加吧！</p>
            </div>
        `;
        return;
    }
    
    logListDiv.innerHTML = logs.map(log => {
        let contentHtml = '';
        
        if (log.mainWork) {
            contentHtml += `<div style="color: #667eea; font-weight: 600; margin-bottom: 6px;">1️⃣ 完成主要工作</div>`;
            contentHtml += `<div style="padding-left: 12px; color: #333; line-height: 1.6; white-space: pre-wrap; margin-bottom: 12px;">${escapeHtml(log.mainWork)}</div>`;
        }
        
        if (log.thoughts) {
            contentHtml += `<div style="color: #10b981; font-weight: 600; margin-bottom: 6px;">2️⃣ 主要思考收获</div>`;
            contentHtml += `<div style="padding-left: 12px; color: #333; line-height: 1.6; white-space: pre-wrap; margin-bottom: 12px;">${escapeHtml(log.thoughts)}</div>`;
        }
        
        if (log.problems) {
            contentHtml += `<div style="color: #f59e0b; font-weight: 600; margin-bottom: 6px;">3️⃣ 待解决问题</div>`;
            contentHtml += `<div style="padding-left: 12px; color: #333; line-height: 1.6; white-space: pre-wrap; margin-bottom: 12px;">${escapeHtml(log.problems)}</div>`;
        }
        
        return `
            <div class="log-item">
                <div class="log-date">${formatDate(log.date)}</div>
                <div class="log-content">${contentHtml}</div>
                <div class="log-actions">
                    <button class="btn btn-secondary btn-small" onclick="editLog('${log.id}')">✏️ 编辑</button>
                    <button class="btn btn-danger btn-small" onclick="deleteLog('${log.id}')">🗑️ 删除</button>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 删除日志
function deleteLog(id) {
    if (confirm('确定要删除这条日志吗？')) {
        Storage.deleteLog(id);
        renderLogs();
        renderStats();
        showToast('🗑️ 日志已删除');
    }
}

// 编辑日志
function editLog(id) {
    const logs = Storage.getLogs();
    const log = logs.find(l => l.id === id);
    
    if (!log) {
        showToast('❌ 日志不存在');
        return;
    }
    
    // 填充表单
    document.getElementById('log-date').value = log.date;
    document.getElementById('main-work').value = log.mainWork || '';
    document.getElementById('thoughts').value = log.thoughts || '';
    document.getElementById('problems').value = log.problems || '';
    
    // 设置编辑模式
    editingLogId = id;
    
    // 更新表单标题和按钮
    const formTitle = document.querySelector('#add-page .card h3');
    if (formTitle) {
        formTitle.textContent = `✏️ 编辑 ${formatDate(log.date)} 的日志`;
    }
    const submitBtn = document.querySelector('#add-page .btn-primary');
    if (submitBtn) {
        submitBtn.textContent = '💾 更新日志';
    }
    
    // 切换到添加页面
    document.querySelectorAll('.tab-item')[0].click();
    
    showToast('📝 进入编辑模式');
}

// 渲染统计
function renderStats() {
    const logs = Storage.getLogs();
    const now = new Date();
    // 获取今天的日期（本地时间）
    const todayStr = getLocalDate();
    
    // 计算本周一的日期
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 如果是周日，往前推6天；否则推到本周一
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    // 计算本月第一天的日期
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 使用字符串比较，避免时区问题
    const todayCount = logs.filter(log => log.date === todayStr).length;
    const weekCount = logs.filter(log => new Date(log.date) >= monday).length;
    const monthCount = logs.filter(log => new Date(log.date) >= monthStart).length;
    
    document.getElementById('total-count').textContent = logs.length;
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('week-count').textContent = weekCount;
    document.getElementById('month-count').textContent = monthCount;
}

// 导出为 Excel
function exportToExcel() {
    const logs = Storage.getLogs();
    if (logs.length === 0) {
        showToast('⚠️ 暂无数据可导出');
        return;
    }
    
    // 准备 Excel 数据
    const excelData = logs.map((log, index) => ({
        '序号': index + 1,
        '日期': log.date,
        '完成主要工作': log.mainWork || '',
        '主要思考收获': log.thoughts || '',
        '待解决问题': log.problems || ''
    }));
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // 设置列宽
    ws['!cols'] = [
        { wch: 8 },   // 序号
        { wch: 15 },  // 日期
        { wch: 40 },  // 完成主要工作
        { wch: 40 },  // 主要思考收获
        { wch: 40 }   // 待解决问题
    ];
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '工作日志');
    
    // 生成文件名
    const filename = `工作日志_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // 导出文件
    XLSX.writeFile(wb, filename);
    showToast('✅ Excel 导出成功');
}

// 导出为 JSON
function exportToJSON() {
    const logs = Storage.getLogs();
    if (logs.length === 0) {
        showToast('⚠️ 暂无数据可导出');
        return;
    }
    
    const content = JSON.stringify(logs, null, 2);
    downloadFile(content, `工作日志_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showToast('✅ JSON 导出成功');
}

// 下载文件
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== 页面初始化开始 ===');
    console.log('UserAuth 是否存在:', typeof UserAuth !== 'undefined');
    
    // 显示当前日期和星期
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekDay = weekDays[now.getDay()];
    document.getElementById('current-date').textContent = `${dateStr} ${weekDay}`;
    
    // 初始化用户认证
    UserAuth.init();
    
    console.log('用户登录状态:', UserAuth.isLoggedIn());
    console.log('当前用户:', UserAuth.currentUser);
    
    // 检查用户登录状态
    if (UserAuth.isLoggedIn()) {
        console.log('已登录，显示主应用');
        // 已登录，显示主应用
        showMainApp();
    } else {
        console.log('未登录，显示登录页面');
        // 未登录，显示登录页面
        showAuthPage();
    }
    
    console.log('=== 页面初始化完成 ===');
});

// 显示主应用
async function showMainApp() {
    // 隐藏登录页面
    document.getElementById('auth-page').style.display = 'none';

    // 显示用户信息
    const username = UserAuth.getUsername();
    document.getElementById('user-info').textContent = `用户: ${username}`;
    document.getElementById('logout-btn').style.display = 'block';

    // 设置默认日期为今天（本地时间）
    document.getElementById('log-date').value = getLocalDate();

    // 初始化：加载用户数据
    await Storage.init();

    // 默认显示添加页面
    document.querySelectorAll('.page').forEach(p => {
        if (p.id !== 'auth-page') {
            p.classList.add('hidden');
        }
    });
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.getElementById('add-page').classList.remove('hidden');
    document.querySelector('.tab-item').classList.add('active');
    currentPage = 'add';

    // 检查是否需要备份提醒
    checkBackupReminder();

    // 设置睡前提醒（页面内通知）
    setupBedtimeReminder();

    // 更新日历提醒开关状态
    checkReminderStatus();
}

// 显示登录页面
function showAuthPage() {
    // 隐藏主应用
    document.getElementById('main-container').style.display = 'none';
    document.querySelector('.tab-bar').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('user-info').textContent = 'v7.0 - 多用户 Supabase 版';

    // 显示登录页面
    document.getElementById('auth-page').style.display = 'block';
    showLoginCard();
}

// 切换认证卡片
function showLoginCard() {
    document.getElementById('login-card').classList.remove('hidden');
    document.getElementById('register-card').classList.add('hidden');
    document.getElementById('reset-card').classList.add('hidden');
    clearAuthMessages();
}

function showRegisterCard() {
    document.getElementById('login-card').classList.add('hidden');
    document.getElementById('register-card').classList.remove('hidden');
    document.getElementById('reset-card').classList.add('hidden');
    clearAuthMessages();
}

function showResetCard() {
    document.getElementById('login-card').classList.add('hidden');
    document.getElementById('register-card').classList.add('hidden');
    document.getElementById('reset-card').classList.remove('hidden');
    document.getElementById('reset-step1').classList.remove('hidden');
    document.getElementById('reset-step2').classList.add('hidden');
    clearAuthMessages();
}

function clearAuthMessages() {
    const els = ['auth-message', 'reg-message', 'reset-message', 'reset-step2-message'];
    els.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

// 处理登录
async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const messageEl = document.getElementById('auth-message');

    if (!username || !password) {
        messageEl.textContent = '请输入用户名和密码';
        return;
    }

    messageEl.textContent = '登录中...';
    messageEl.style.color = '#666';

    const result = await UserAuth.login(username, password);

    if (result.success) {
        messageEl.textContent = '✅ 登录成功，正在跳转...';
        messageEl.style.color = '#27ae60';
        setTimeout(() => { location.reload(); }, 1000);
    } else {
        messageEl.textContent = result.message;
        messageEl.style.color = '#e74c3c';
    }
}

// 处理注册
async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const securityAnswer = document.getElementById('reg-security-answer').value;
    const messageEl = document.getElementById('reg-message');

    if (!username || !password) {
        messageEl.textContent = '请输入用户名和密码';
        return;
    }
    if (!securityAnswer.trim()) {
        messageEl.textContent = '请填写安全问答答案';
        return;
    }

    messageEl.textContent = '注册中...';
    messageEl.style.color = '#666';

    const result = await UserAuth.register(username, password, securityAnswer);

    if (result.success) {
        messageEl.textContent = '✅ 注册成功，自动登录中...';
        messageEl.style.color = '#27ae60';
        setTimeout(() => { location.reload(); }, 1000);
    } else {
        messageEl.textContent = result.message;
        messageEl.style.color = '#e74c3c';
    }
}

// 找回密码 - 存储验证通过的 userId
let resetUserId = null;

// 步骤1：验证安全问答
async function handleVerifyAnswer() {
    const username = document.getElementById('reset-username').value.trim();
    const answer = document.getElementById('reset-answer').value;
    const messageEl = document.getElementById('reset-message');

    if (!username || !answer) {
        messageEl.textContent = '请填写用户名和安全答案';
        return;
    }

    messageEl.textContent = '验证中...';
    messageEl.style.color = '#666';

    const result = await UserAuth.verifySecurityAnswer(username, answer);

    if (result.success) {
        resetUserId = result.userId;
        document.getElementById('reset-step1').classList.add('hidden');
        document.getElementById('reset-step2').classList.remove('hidden');
        document.getElementById('reset-message').textContent = '';
    } else {
        messageEl.textContent = result.message;
        messageEl.style.color = '#e74c3c';
        resetUserId = null;
    }
}

// 步骤2：设置新密码
async function handleResetPassword() {
    const newPassword = document.getElementById('reset-new-password').value;
    const messageEl = document.getElementById('reset-step2-message');

    if (!resetUserId) {
        showLoginCard();
        return;
    }

    if (!newPassword || newPassword.length < 6) {
        messageEl.textContent = '新密码至少需要 6 位';
        messageEl.style.color = '#e74c3c';
        return;
    }

    messageEl.textContent = '重置中...';
    messageEl.style.color = '#666';

    const result = await UserAuth.resetPassword(resetUserId, newPassword);

    if (result.success) {
        messageEl.textContent = '✅ 密码重置成功，请重新登录';
        messageEl.style.color = '#27ae60';
        resetUserId = null;
        // 回到登录页
        setTimeout(() => { showLoginCard(); }, 1500);
    } else {
        messageEl.textContent = result.message;
        messageEl.style.color = '#e74c3c';
    }
}

// 处理登出
function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        UserAuth.logout();
        location.reload();
    }
}

// 检查备份提醒
function checkBackupReminder() {
    const logs = Storage.getLogs();
    if (logs.length === 0) return;
    
    const lastBackup = localStorage.getItem('last_backup_time');
    const now = Date.now();
    
    // 如果超过7天未备份且有数据，提醒用户
    if (!lastBackup || (now - parseInt(lastBackup)) > 7 * 24 * 60 * 60 * 1000) {
        if (logs.length >= 3) {  // 至少有3条记录才提醒
            setTimeout(() => {
                showToast('💡 提示：建议定期导出备份数据');
            }, 2000);
        }
    }
}

// 睡前提醒功能
let reminderTimerInterval = null;

function setupBedtimeReminder() {
    // 清除旧定时器
    if (reminderTimerInterval) clearInterval(reminderTimerInterval);

    // 首次检查
    checkAndRemind();

    // 每分钟检查一次是否到达 21:00（页面打开时有效）
    reminderTimerInterval = setInterval(() => {
        checkAndRemind();
    }, 60000);

    // 页面从后台恢复时也检查一次
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAndRemind();
        }
    });
}

function checkAndRemind() {
    const lastReminder = localStorage.getItem('last_bedtime_reminder');
    const today = getLocalDate();

    // 今天已经提醒过，跳过
    if (lastReminder === today) return;

    // 今天已经写过日志，跳过
    const logs = Storage.getLogs();
    const hasTodayLog = logs.some(log => log.date === today);
    if (hasTodayLog) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 只在 21:00 - 21:05 之间触发（五分钟窗口，每分钟检查一次必能命中）
    if (currentHour === 21 && currentMinute >= 0 && currentMinute < 5) {
        sendBedtimeNotification();
        localStorage.setItem('last_bedtime_reminder', today);
    }

    // 21:05 之后还没提醒过且没写日志，补发提醒
    if (currentHour >= 21 && currentMinute >= 5 && currentHour < 23) {
        sendBedtimeNotification();
        localStorage.setItem('last_bedtime_reminder', today);
    }
}

// 发送睡前通知
function sendBedtimeNotification() {
    // 先显示 Toast 提醒
    showToast('🌙 睡前提醒：别忘了记录今天的工作日志哦！');
    
    // 尝试发送系统通知
    if ('Notification' in window) {
        // 如果还没有权限，请求权限
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    createNotification();
                }
            });
        } else if (Notification.permission === 'granted') {
            // 已有权限，直接发送
            createNotification();
        }
    }
}

// 创建系统通知
function createNotification() {
    const notification = new Notification('🌙 工作日志提醒', {
        body: '睡前别忘了记录今天的工作日志哦！',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'bedtime-reminder',
        requireInteraction: true, // 保持通知直到用户点击
        silent: false
    });
    
    // 点击通知时打开应用
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
    
    // 10 秒后自动关闭
    setTimeout(() => {
        notification.close();
    }, 10000);
}

// 导出时更新备份时间
const originalExportToExcel = exportToExcel;
exportToExcel = function() {
    originalExportToExcel();
    localStorage.setItem('last_backup_time', Date.now().toString());
};

// ===== 系统日历提醒功能 =====

// 检查提醒状态
function checkReminderStatus() {
    const reminderEnabled = localStorage.getItem('bedtime_reminder_enabled');
    const reminderCard = document.getElementById('reminder-card');
    const reminderTitle = document.getElementById('reminder-title');
    const reminderDesc = document.getElementById('reminder-desc');

    if (reminderEnabled === 'true') {
        reminderCard.classList.add('active');
        reminderTitle.textContent = '✅ 睡前提醒已开启';
        reminderDesc.textContent = '每晚21:00系统日历自动提醒（点击查看教程）';
    } else {
        reminderCard.classList.remove('active');
        reminderTitle.textContent = '🌙 开启睡前提醒';
        reminderDesc.textContent = '下载日历文件后需手动添加 → 点击查看教程';
    }
}

// 切换提醒状态
function toggleReminder() {
    const reminderEnabled = localStorage.getItem('bedtime_reminder_enabled');

    if (reminderEnabled === 'true') {
        // 已开启 → 显示教程和选项
        openReminderGuide();
    } else {
        // 未开启 → 下载 ICS 文件
        addCalendarReminder();
    }
}

// 添加日历提醒 - 生成带 RRULE 的重复事件
function addCalendarReminder() {
    const icsContent = generateRecurringICS();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const file = new File([blob], 'work-log-reminder.ics', { type: 'text/calendar' });

    // Android: 使用 Web Share API 分享 ICS 文件
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
            files: [file],
            title: '添加每日工作日志提醒'
        }).then(() => {
            localStorage.setItem('bedtime_reminder_enabled', 'true');
            checkReminderStatus();
            openReminderGuide();
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                fallbackDownloadICS(icsContent);
            }
        });
    } else {
        // iOS / 桌面端：下载 ICS 文件
        fallbackDownloadICS(icsContent);
    }
}

// 下载 ICS 文件并弹出引导
function fallbackDownloadICS(icsContent) {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'work-log-reminder.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    localStorage.setItem('bedtime_reminder_enabled', 'true');
    checkReminderStatus();

    // 稍等文件下载完成后弹出引导
    setTimeout(() => {
        openReminderGuide();
    }, 500);
}

// 打开提醒操作引导弹窗
function openReminderGuide() {
    const overlay = document.getElementById('reminder-guide-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

// 关闭提醒操作引导弹窗
function closeReminderGuide(event) {
    // 点击遮罩层关闭（event 为点击事件）或直接调用
    if (event && event.target !== document.getElementById('reminder-guide-overlay')) return;
    const overlay = document.getElementById('reminder-guide-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// 生成带 RRULE 的每日重复 ICS 日历文件
function generateRecurringICS() {
    const formatICSDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    const now = new Date();
    const uid = `worklog-daily-reminder@worklog-app`;

    // 首次事件从今天或明天 21:00 开始
    const firstEvent = new Date(now);
    firstEvent.setHours(21, 0, 0, 0);
    if (now.getHours() >= 21) {
        firstEvent.setDate(firstEvent.getDate() + 1);
    }

    const firstEnd = new Date(firstEvent);
    firstEnd.setMinutes(30);

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Work Log App//Daily Reminder//CN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:工作日志提醒',
        'X-WR-CALDESC:每晚21:00提醒记录工作日志',
        'X-WR-TIMEZONE:Asia/Shanghai',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICSDate(now)}`,
        `DTSTART;TZID=Asia/Shanghai:${formatICSDate(firstEvent)}`,
        `DTEND;TZID=Asia/Shanghai:${formatICSDate(firstEnd)}`,
        'SUMMARY:🌙 记录工作日志',
        'DESCRIPTION:今天的工作内容记录了吗？\\n\\n打开工作日志 App 记录今天完成的主要工作、思考收获和待解决问题。',
        'LOCATION:工作日志 App',
        'RRULE:FREQ=DAILY;INTERVAL=1',
        'BEGIN:VALARM',
        'TRIGGER:-PT0M',
        'ACTION:DISPLAY',
        'DESCRIPTION:🌙 别忘了记录今天的工作日志！',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
}

// 移除日历提醒（清除本地状态）
function removeCalendarReminder() {
    localStorage.removeItem('bedtime_reminder_enabled');
    localStorage.removeItem('last_bedtime_reminder');
    checkReminderStatus();
}
