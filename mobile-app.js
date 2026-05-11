// 数据存储
const Storage = {
    getLogs() {
        const data = localStorage.getItem('mobile_work_logs');
        return data ? JSON.parse(data) : [];
    },

    saveLogs(logs) {
        localStorage.setItem('mobile_work_logs', JSON.stringify(logs));
    },

    addLog(log) {
        const logs = this.getLogs();
        logs.unshift(log);
        this.saveLogs(logs);
    },

    updateLog(updatedLog) {
        const logs = this.getLogs();
        const index = logs.findIndex(log => log.id === updatedLog.id);
        if (index !== -1) {
            logs[index] = updatedLog;
            this.saveLogs(logs);
        }
    },

    deleteLog(id) {
        const logs = this.getLogs().filter(log => log.id !== id);
        this.saveLogs(logs);
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
    event.currentTarget.classList.add('active');
    
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
        const updatedLog = {
            id: editingLogId,
            date: logDate,
            mainWork: mainWork,
            thoughts: thoughts,
            problems: problems,
            createdAt: Date.now()
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
        
        Storage.addLog(newLog);
        showToast('✅ 日志已保存');
    }
    
    clearForm();
    
    // 自动切换到查看页面
    setTimeout(() => {
        document.querySelectorAll('.tab-item')[1].click();
    }, 500);
}

// 清空表单
function clearForm() {
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const todayCount = logs.filter(log => new Date(log.date).getTime() === today.getTime()).length;
    const weekCount = logs.filter(log => new Date(log.date) >= weekAgo).length;
    const monthCount = logs.filter(log => new Date(log.date) >= monthAgo).length;
    
    document.getElementById('total-count').textContent = logs.length;
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('week-count').textContent = weekCount;
    document.getElementById('month-count').textContent = monthCount;
}

// 导出为 TXT
function exportToTXT() {
    const logs = Storage.getLogs();
    if (logs.length === 0) {
        showToast('⚠️ 暂无数据可导出');
        return;
    }
    
    let content = '工作日志导出\n';
    content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
    content += `总记录数：${logs.length}\n`;
    content += '='.repeat(50) + '\n\n';
    
    logs.forEach((log, index) => {
        content += `【第${index + 1}条】${formatDate(log.date)}\n`;
        if (log.mainWork) {
            content += `\n1️⃣ 完成主要工作：\n${log.mainWork}\n`;
        }
        if (log.thoughts) {
            content += `\n2️⃣ 主要思考收获：\n${log.thoughts}\n`;
        }
        if (log.problems) {
            content += `\n3️⃣ 待解决问题：\n${log.problems}\n`;
        }
        content += '\n' + '-'.repeat(50) + '\n\n';
    });
    
    downloadFile(content, `工作日志_${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    showToast('✅ TXT 导出成功');
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
document.addEventListener('DOMContentLoaded', function() {
    // 显示当前日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    document.getElementById('current-date').textContent = dateStr;
    
    // 设置默认日期为今天
    document.getElementById('log-date').value = now.toISOString().split('T')[0];
    
    // 默认显示添加页面
    switchTab('add');
    
    // 检查是否需要备份提醒
    checkBackupReminder();
});

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

// 导出时更新备份时间
const originalExportToExcel = exportToExcel;
exportToExcel = function() {
    originalExportToExcel();
    localStorage.setItem('last_backup_time', Date.now().toString());
};
