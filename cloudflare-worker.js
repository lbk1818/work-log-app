// Cloudflare Worker - 工作日志同步 API
// 部署到 Cloudflare Workers

const WORKER_CONFIG = {
    // 数据库配置
    dbName: 'work-logs-db',
    tableName: 'logs'
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
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return new Response(
                JSON.stringify({ error: '需要 userId 参数' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        try {
            // 初始化数据库
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

            // 路由处理
            if (request.method === 'GET') {
                return await handleGetLogs(request, url, userId, env, corsHeaders);
            } else if (request.method === 'POST') {
                if (url.pathname === '/logs/sync') {
                    return await handleSyncLogs(request, userId, env, corsHeaders);
                }
                return await handleAddLog(request, userId, env, corsHeaders);
            } else if (request.method === 'PUT') {
                return await handleUpdateLog(request, userId, env, corsHeaders);
            } else if (request.method === 'DELETE') {
                return await handleDeleteLog(url, userId, env, corsHeaders);
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

// 添加日志
async function handleAddLog(request, userId, env, corsHeaders) {
    const data = await request.json();
    const log = data.log;

    await env.DB.prepare(
        `INSERT INTO ${WORKER_CONFIG.tableName} (id, user_id, date, mainWork, thoughts, problems, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        log.id,
        userId,
        log.date,
        log.mainWork || '',
        log.thoughts || '',
        log.problems || '',
        log.createdAt
    ).run();

    return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

// 更新日志
async function handleUpdateLog(request, userId, env, corsHeaders) {
    const data = await request.json();
    const log = data.log;

    await env.DB.prepare(
        `UPDATE ${WORKER_CONFIG.tableName} 
         SET date = ?, mainWork = ?, thoughts = ?, problems = ?, updatedAt = ? 
         WHERE id = ? AND user_id = ?`
    ).bind(
        log.date,
        log.mainWork || '',
        log.thoughts || '',
        log.problems || '',
        Date.now(),
        log.id,
        userId
    ).run();

    return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

// 删除日志
async function handleDeleteLog(url, userId, env, corsHeaders) {
    const logId = url.pathname.split('/').pop();

    await env.DB.prepare(
        `DELETE FROM ${WORKER_CONFIG.tableName} WHERE id = ? AND user_id = ?`
    ).bind(logId, userId).run();

    return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
