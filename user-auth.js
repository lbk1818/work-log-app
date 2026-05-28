// 用户认证模块（Supabase 版）
const SUPABASE_CONFIG = {
    url: 'https://tvyllbbgcvgrqayzgkls.supabase.co',
    key: 'sb_publishable_Dfru_g7NRn9pcbD2RymuTQ_ZlFoM81_'
};

// 密码哈希工具 - 使用 Web Crypto API (SHA-256 + salt)
const PasswordHasher = {
    // 生成随机 salt
    generateSalt() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    },

    // 将字符串转为 ArrayBuffer
    encodeText(text) {
        return new TextEncoder().encode(text);
    },

    // ArrayBuffer 转 hex 字符串
    bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
    },

    // 使用 SHA-256 哈希密码
    async hash(password, salt) {
        const data = this.encodeText(password + salt);
        // 多次哈希增加破解难度
        let hashBuffer = await crypto.subtle.digest('SHA-256', data);
        for (let i = 0; i < 1000; i++) {
            hashBuffer = await crypto.subtle.digest('SHA-256', hashBuffer);
        }
        return this.bufferToHex(hashBuffer);
    },

    // 验证密码
    async verify(password, storedHash, salt) {
        const hash = await this.hash(password, salt);
        return hash === storedHash;
    }
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

    // 注册输入校验（密码要求6位以上）
    validateRegisterInput(username, password) {
        if (!username || !password) {
            return '用户名和密码不能为空';
        }
        if (username.length < 2 || username.length > 30) {
            return '用户名长度需要 2-30 个字符';
        }
        if (!/^[a-zA-Z0-9_一-龥]+$/.test(username)) {
            return '用户名只能包含中英文、数字和下划线';
        }
        if (password.length < 6) {
            return '密码至少需要 6 位';
        }
        return null;
    },

    // 登录输入校验（兼容老用户4位密码）
    validateLoginInput(username, password) {
        if (!username || !password) {
            return '用户名和密码不能为空';
        }
        if (username.length < 2 || username.length > 30) {
            return '用户名长度需要 2-30 个字符';
        }
        if (!/^[a-zA-Z0-9_一-龥]+$/.test(username)) {
            return '用户名只能包含中英文、数字和下划线';
        }
        return null;
    },

    // 注册用户（Supabase）
    async register(username, password, securityAnswer) {
        try {
            const validationError = this.validateRegisterInput(username, password);
            if (validationError) {
                return { success: false, message: validationError };
            }

            if (!securityAnswer || securityAnswer.trim().length < 1) {
                return { success: false, message: '请填写安全问答答案' };
            }

            // 哈希密码
            const salt = PasswordHasher.generateSalt();
            const passwordHash = await PasswordHasher.hash(password, salt);
            const storedPassword = salt + ':' + passwordHash;

            // 哈希安全问答答案
            const answerSalt = PasswordHasher.generateSalt();
            const answerHash = await PasswordHasher.hash(securityAnswer.trim(), answerSalt);
            const storedAnswer = answerSalt + ':' + answerHash;

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
                    password: storedPassword,
                    security_answer: storedAnswer
                })
            });

            if (!response.ok) {
                const error = await response.json();
                if (response.status === 409 || (error && error.code === '23505')) {
                    return { success: false, message: '注册失败，请重试' };
                }
                return { success: false, message: '注册失败，请重试' };
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

    // 找回密码 - 验证安全问答
    async verifySecurityAnswer(username, answer) {
        try {
            if (!username || !answer) {
                return { success: false, message: '请填写用户名和答案' };
            }

            const response = await fetch(
                `${SUPABASE_CONFIG.url}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id,security_answer`,
                {
                    headers: {
                        'apikey': SUPABASE_CONFIG.key,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
                    }
                }
            );

            const users = await response.json();

            if (!users || users.length === 0) {
                // 模拟延时防枚举
                await PasswordHasher.hash('dummy', '0000000000000000');
                return { success: false, message: '用户名或安全答案错误' };
            }

            const user = users[0];

            if (!user.security_answer) {
                return { success: false, message: '该账号未设置安全问答，无法找回密码' };
            }

            const parts = (user.security_answer || '').split(':');
            let valid = false;

            if (parts.length === 2) {
                valid = await PasswordHasher.verify(answer.trim(), parts[1], parts[0]);
            } else {
                // 兼容旧格式（明文或旧版哈希）
                valid = (user.security_answer === answer.trim());
            }

            if (!valid) {
                return { success: false, message: '用户名或安全答案错误' };
            }

            return { success: true, userId: user.id };
        } catch (error) {
            console.error('验证安全答案失败:', error);
            return { success: false, message: '验证失败，请重试' };
        }
    },

    // 重置密码
    async resetPassword(userId, newPassword) {
        try {
            if (!newPassword || newPassword.length < 6) {
                return { success: false, message: '新密码至少需要 6 位' };
            }

            const salt = PasswordHasher.generateSalt();
            const passwordHash = await PasswordHasher.hash(newPassword, salt);
            const storedPassword = salt + ':' + passwordHash;

            const response = await fetch(
                `${SUPABASE_CONFIG.url}/rest/v1/users?id=eq.${userId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_CONFIG.key,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
                    },
                    body: JSON.stringify({ password: storedPassword })
                }
            );

            if (!response.ok) {
                return { success: false, message: '重置密码失败，请重试' };
            }

            return { success: true, message: '密码重置成功，请重新登录' };
        } catch (error) {
            console.error('重置密码失败:', error);
            return { success: false, message: '重置密码失败，请重试' };
        }
    },

    // 用户登录（Supabase）
    async login(username, password) {
        try {
            const validationError = this.validateLoginInput(username, password);
            if (validationError) {
                return { success: false, message: validationError };
            }

            // 只查询 id 和 password，不做明码比较
            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id,password`, {
                headers: {
                    'apikey': SUPABASE_CONFIG.key,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
                }
            });

            const users = await response.json();

            // 使用统一错误信息防止用户名枚举
            if (!users || users.length === 0) {
                // 模拟哈希运算时间，防止时序攻击泄露用户存在信息
                await PasswordHasher.hash('dummy', '0000000000000000');
                return { success: false, message: '用户名或密码错误' };
            }

            const user = users[0];

            // 解析存储的密码 (格式: salt:hash)
            const parts = (user.password || '').split(':');
            if (parts.length !== 2) {
                // 旧格式明文密码兼容
                if (user.password === password) {
                    // 自动升级为哈希格式
                    const salt = PasswordHasher.generateSalt();
                    const newHash = await PasswordHasher.hash(password, salt);
                    await fetch(`${SUPABASE_CONFIG.url}/rest/v1/users?id=eq.${user.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_CONFIG.key,
                            'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
                        },
                        body: JSON.stringify({ password: salt + ':' + newHash })
                    });
                } else {
                    return { success: false, message: '用户名或密码错误' };
                }
            } else {
                const isValid = await PasswordHasher.verify(password, parts[1], parts[0]);
                if (!isValid) {
                    return { success: false, message: '用户名或密码错误' };
                }
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
