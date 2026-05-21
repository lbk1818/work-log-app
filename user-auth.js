// 用户认证模块（Supabase 版）
const SUPABASE_CONFIG = {
    url: 'https://tvyllbbgcvgrqayzgkls.supabase.co',
    key: 'sb_publishable_Dfru_g7NRn9pcbD2RymuTQ_ZlFoM81_'
};

const UserAuth = {
    currentUser: null,

    // 初始化：检查是否有已登录用户
    init() {
        const savedUser = localStorage.getItem('current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            console.log('已登录用户:', this.currentUser.username);
            return true;
        }
        return false;
    },

    // 注册用户（Supabase）
    async register(username, password) {
        try {
            // 检查用户名是否已存在
            const checkResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/users?username=eq.${username}&select=id`, {
                headers: {
                    'apikey': SUPABASE_CONFIG.key,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
                }
            });
            
            const existingUsers = await checkResponse.json();
            if (existingUsers && existingUsers.length > 0) {
                return { success: false, message: '用户名已存在' };
            }

            // 创建新用户
            const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_CONFIG.key,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    id: userId,
                    username: username,
                    password: password
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return { success: false, message: error.message || '注册失败' };
            }

            // 自动登录
            this.currentUser = {
                username: username,
                userId: userId
            };
            localStorage.setItem('current_user', JSON.stringify(this.currentUser));
            
            return { success: true, message: '注册成功' };
        } catch (error) {
            console.error('注册失败:', error);
            return { success: false, message: '注册失败，请重试' };
        }
    },

    // 用户登录（Supabase）
    async login(username, password) {
        try {
            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/users?username=eq.${username}&select=id,password`, {
                headers: {
                    'apikey': SUPABASE_CONFIG.key,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
                }
            });

            const users = await response.json();
            
            if (!users || users.length === 0) {
                return { success: false, message: '用户名或密码错误' };
            }

            const user = users[0];
            if (user.password !== password) {
                return { success: false, message: '用户名或密码错误' };
            }

            this.currentUser = {
                username: username,
                userId: user.id
            };
            localStorage.setItem('current_user', JSON.stringify(this.currentUser));
            
            return { success: true, message: '登录成功' };
        } catch (error) {
            console.error('登录失败:', error);
            return { success: false, message: '登录失败，请重试' };
        }
    },

    // 用户登出
    logout() {
        this.currentUser = null;
        localStorage.removeItem('current_user');
    },

    // 获取当前用户 ID
    getUserId() {
        return this.currentUser ? this.currentUser.userId : null;
    },

    // 获取当前用户名
    getUsername() {
        return this.currentUser ? this.currentUser.username : null;
    },

    // 检查是否已登录
    isLoggedIn() {
        return this.currentUser !== null;
    }
};
