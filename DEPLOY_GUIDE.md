# Cloudflare Worker 部署指南

##  部署步骤

### 方法一：通过 Cloudflare Dashboard 部署（推荐）

1. **访问 Cloudflare Workers**：
   https://dash.cloudflare.com/1349880215/workers-and-pages

2. **找到 `work-log-sync` Worker**

3. **点击"编辑代码"**

4. **删除现有代码**

5. **复制并粘贴以下完整代码**：

```javascript
// Cloudflare Worker - 工作日志同步 API（支持多用户）
// 部署到 Cloudflare Workers

const WORKER_CONFIG = {
    dbName: 'work-logs-db',
    tableName: 'logs',
    usersTableName: 'users'
};

export default {
    async fetch(request, env, ctx) {
        // 允许跨域访问
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        // 处理 OPTIONS 请求
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const pathname = url.pathname;

        try {
            // 初始化数据库表
            await initializeDatabase(env);

            // 路由处理
            // 用户注册
            if (pathname === '/api/register' && request.method === 'POST') {
                return await handleRegister(request, env, corsHeaders);
            }
            
            // 用户登录
            if (pathname === '/api/login' && request.method === 'POST') {
                return await handleLogin(request, env, corsHeaders);
            }

            // 获取 userId
            const userId = url.searchParams.get('userId');
            if (!userId && pathname.startsWith('/api/logs')) {
                return new Response(
                    JSON.stringify({ error: '需要 userId 参数' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // 日志操作
            if (pathname.startsWith('/api/logs')) {
                if (request.method === 'GET') {
                    return await handleGetLogs(request, url, userId, env, corsHeaders);
                } else if (request.method === 'POST') {
                    if (pathname === '/api/logs/sync') {
                        return await handleSyncLogs(request, userId, env, corsHeaders);
                    }
                    return await handleBatchSaveLogs(request, userId, env, corsHeaders);
                }
            }

            return new Response(
                JSON.stringify({ error: 'Not Found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        } catch (error) {
            console.error('Worker Error:', error);
            return new Response(
                JSON.stringify({ error: '服务器错误', details: error.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
    }
};

// 初始化数据库
async function initializeDatabase(env) {
    // 创建日志表
    await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS ${WORKER_CONFIG.tableName} (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            mainWork TEXT,
            thoughts TEXT,
            problems TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER
        )
    `);

    // 创建用户表
    await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS ${WORKER_CONFIG.usersTableName} (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            createdAt INTEGER NOT NULL
        )
    `);
}

// 用户注册
async function handleRegister(request, env, corsHeaders) {
    const data = await request.json();
    const { username, password } = data;

    if (!username || !password) {
        return new Response(
            JSON.stringify({ success: false, message: '用户名和密码不能为空' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (password.length < 4) {
        return new Response(
            JSON.stringify({ success: false, message: '密码至少需要 4 位' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // 检查用户名是否已存在
        const existing = await env.DB.prepare(
            `SELECT id FROM ${WORKER_CONFIG.usersTableName} WHERE username = ?`
        ).bind(username).first();

        if (existing) {
            return new Response(
                JSON.stringify({ success: false, message: '用户名已存在' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 创建新用户（简单存储，生产环境建议使用 bcrypt 加密）
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        await env.DB.prepare(
            `INSERT INTO ${WORKER_CONFIG.usersTableName} (id, username, password, createdAt) 
             VALUES (?, ?, ?, ?)`
        ).bind(userId, username, password, Date.now()).run();

        return new Response(
            JSON.stringify({ 
                success: true, 
                message: '注册成功',
                userId: userId 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('注册错误:', error);
        return new Response(
            JSON.stringify({ success: false, message: '注册失败，请稍后重试' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}

// 用户登录
async function handleLogin(request, env, corsHeaders) {
    const data = await request.json();
    const { username, password } = data;

    if (!username || !password) {
        return new Response(
            JSON.stringify({ success: false, message: '用户名和密码不能为空' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // 查询用户
        const user = await env.DB.prepare(
            `SELECT id, username, password FROM ${WORKER_CONFIG.usersTableName} WHERE username = ?`
        ).bind(username).first();

        if (!user) {
            return new Response(
                JSON.stringify({ success: false, message: '用户名或密码错误' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 验证密码（简单比较，生产环境建议使用 bcrypt）
        if (user.password !== password) {
            return new Response(
                JSON.stringify({ success: false, message: '用户名或密码错误' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ 
                success: true, 
                message: '登录成功',
                userId: user.id 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('登录错误:', error);
        return new Response(
            JSON.stringify({ success: false, message: '登录失败，请稍后重试' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}

// 获取用户的日志
async function handleGetLogs(request, url, userId, env, corsHeaders) {
    const date = url.searchParams.get('date');
    
    let query = `SELECT * FROM ${WORKER_CONFIG.tableName} WHERE user_id = ?`;
    let params = [userId];

    if (date) {
        query += ' AND date = ?';
        params.push(date);
    }

    query += ' ORDER BY date DESC, createdAt DESC';

    const result = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(
        JSON.stringify({ success: true, logs: result.results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

// 批量保存日志（覆盖式）
async function handleBatchSaveLogs(request, userId, env, corsHeaders) {
    const data = await request.json();
    const logs = data.logs;

    if (!logs || !Array.isArray(logs)) {
        return new Response(
            JSON.stringify({ error: '无效的日志数据' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // 先删除用户的所有日志
        await env.DB.prepare(
            `DELETE FROM ${WORKER_CONFIG.tableName} WHERE user_id = ?`
        ).bind(userId).run();

        // 批量插入新数据
        if (logs.length > 0) {
            const stmt = env.DB.prepare(
                `INSERT INTO ${WORKER_CONFIG.tableName} 
                 (id, user_id, date, mainWork, thoughts, problems, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            );

            const batch = logs.map(log => 
                stmt.bind(
                    log.id,
                    userId,
                    log.date,
                    log.mainWork || '',
                    log.thoughts || '',
                    log.problems || '',
                    log.createdAt,
                    log.updatedAt || null
                )
            );

            await env.DB.batch(batch);
        }

        return new Response(
            JSON.stringify({ success: true, saved: logs.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('保存日志错误:', error);
        return new Response(
            JSON.stringify({ success: false, message: '保存失败' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}

// 批量同步
async function handleSyncLogs(request, userId, env, corsHeaders) {
    const data = await request.json();
    const logs = data.logs;

    // 先删除用户的所有日志
    await env.DB.prepare(
        `DELETE FROM ${WORKER_CONFIG.tableName} WHERE user_id = ?`
    ).bind(userId).run();

    // 批量插入新数据
    if (logs.length > 0) {
        const stmt = env.DB.prepare(
            `INSERT OR REPLACE INTO ${WORKER_CONFIG.tableName} 
             (id, user_id, date, mainWork, thoughts, problems, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );

        const batch = logs.map(log => 
            stmt.bind(
                log.id,
                userId,
                log.date,
                log.mainWork || '',
                log.thoughts || '',
                log.problems || '',
                log.createdAt,
                log.updatedAt || null
            )
        );

        await env.DB.batch(batch);
    }

    return new Response(
        JSON.stringify({ success: true, synced: logs.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}
```

6. **点击"部署"**

---

### 第三步：测试多用户功能

1. **访问应用**：
   https://work-log-app.pages.dev

2. **注册第一个账号**：
   - 用户名：`test1`
   - 密码：`123456`
   - 点击"注册新账号"

3. **添加一些日志**

4. **退出登录**，注册第二个账号：
   - 用户名：`test2`
   - 密码：`123456`

5. **验证数据隔离**：
   - test2 账号应该看不到 test1 的日志
   - 每个账号的数据完全独立

---

## ⚠️ 注意事项

1. **数据库已存在**：之前已经绑定过 D1 数据库，Worker 会自动创建用户表
2. **密码存储**：当前版本使用明文存储（简化版），生产环境建议加密
3. **数据迁移**：之前的本地数据不会自动迁移，需要手动重新添加

---

**现在开始部署吧！遇到任何问题随时告诉我！** 🚀
