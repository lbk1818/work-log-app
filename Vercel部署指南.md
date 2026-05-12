# 部署到 Vercel 指南

## 优势
- ✅ 国内可访问
- ✅ 完全免费
- ✅ 自动部署
- ✅ 速度快

## 部署步骤

### 第 1 步：注册 Vercel
1. 访问 https://vercel.com
2. 点击 "Sign Up"
3. 选择 "Continue with GitHub"
4. 授权 Vercel 访问您的 GitHub 账号

### 第 2 步：导入项目
1. 登录后点击 "Add New..." → "Project"
2. 找到 `work-log-app` 仓库
3. 点击 "Import"

### 第 3 步：配置部署
1. **Framework Preset**: 选择 "Other"
2. **Root Directory**: 选择 `mobile-work-log`
3. 其他设置保持默认
4. 点击 "Deploy"

### 第 4 步：等待部署
- 部署时间：约 30 秒
- 部署成功后会显示访问地址
- 格式：`https://work-log-app.vercel.app`

### 第 5 步：自定义域名（可选）
1. 进入项目设置 → "Domains"
2. 添加自定义域名（如果有）

## 后续使用

### 更新代码
```bash
cd d:\lingma\mobile-work-log
git add .
git commit -m "更新内容"
git push
```
**Vercel 会自动部署**，无需任何操作！

### 访问应用
- 默认地址：`https://work-log-app.vercel.app`
- 或自定义域名

## 优势对比

| 功能 | GitHub Pages | Vercel |
|------|-------------|--------|
| 国内访问 |  不稳定 | ✅ 稳定 |
| 部署速度 | 1-2 分钟 | 30 秒 |
| 自动 HTTPS | ✅ | ✅ |
| 免费额度 | 100GB/月 | 无限 |
| 自定义域名 | ✅ | ✅ |

## 常见问题

### Q: Vercel 收费吗？
A: 个人项目完全免费，额度足够个人使用。

### Q: 需要绑定信用卡吗？
A: 不需要，GitHub 账号登录即可。

### Q: 部署失败怎么办？
A: 检查 Vercel 项目设置，确保 Root Directory 是 `mobile-work-log`。

### Q: 可以删除 GitHub Pages 吗？
A: 可以，但建议保留 GitHub 作为代码备份。

## 开始部署
立即访问：https://vercel.com/new
