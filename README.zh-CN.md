# NUS Canvas 课程看板

[English](README.md) | [简体中文](README.zh-CN.md)

采用 Apple 风格的响应式课程看板，将作业截止、Quiz、课程公告和学期日历集中展示。基于 Next.js、React 和 Tailwind CSS，支持自行部署与 AI / agent 辅助配置。

保留历史事项、查看临近截止，并能在手机浏览器中使用。本项目为学生个人开源项目，与 NUS 或 Instructure 无官方关联，也未获得其官方背书。

## 预览

截图仅使用**虚构演示课程**，不包含学生身份、成绩、真实课程事项或作者的账户信息。

### 桌面端

![使用虚构课程数据的桌面看板](docs/screenshots/desktop.jpg)

### 手机浏览器

<img src="docs/screenshots/mobile.jpg" alt="使用虚构课程数据的手机浏览器看板" width="390" />

## 两分钟运行演示

需要 Node.js 22.13+ 和 npm。演示模式无需 Canvas 账户或凭据。

```bash
git clone https://github.com/woodyhouse/nus-canvas-dashboard.git
cd nus-canvas-dashboard
npm ci
npm run dev
```

打开 http://localhost:3000。`predev` 仅在本地 `data/events.json` 不存在时，从 `data/events.example.json` 创建该文件；真实数据文件已被 Git 忽略，现有学生数据不会被覆盖。

## 连接自己的 Canvas 账户

**重要前提：**仅登录 Canvas 不会自动获得 API 权限。供其他用户使用的应用需要学校批准的 OAuth Developer Key。对于托管版 Canvas，该 key 由学校管理员签发。本仓库不包含共用的 client secret，也不会要求同学为分发的应用生成并提供个人 access token。详见 [Canvas OAuth 官方文档](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth)。

当前版本包含一个**单用户本地 OAuth 客户端**。学校需要批准该独立部署所使用的客户端，并登记准确的 redirect URI。共用的学校集成需要由管理员维护后端，不能将其 client secret 分发到每位同学的电脑。

满足这一前提后，agent 可以协助安装、配置、同步、构建和部署。Canvas 登录、MFA 和 OAuth 授权由你亲自完成；权限授予、部署平台登录和可能产生的托管费用仍需你的明确决定。

```bash
npm run setup
# 在本机私下配置 .env.local，填入获批的 client ID 和 client secret。
npm run canvas:login
# 打开终端显示的 Canvas 授权链接，登录并确认授权。
npm run canvas:sync
npm run dev
```

`canvas:login` 仅监听 `127.0.0.1:8787`，校验随机的一次性 OAuth state，交换授权码，并将 token 加密保存到 `.local/oauth.enc`。加密密钥保存在被 Git 忽略的 `.env.local` 中。应限制这两个文件仅供自己的操作系统账户访问；该机制用于降低意外泄露风险，无法抵御已被攻破的电脑。任何数据都不会发送给作者。Canvas 数据查询仅使用 GET；OAuth token 交换与刷新使用必要的认证 POST 接口。

管理员应在 Developer Key 上限制 scopes，仅允许查询活跃课程、作业（包括当前用户自己的提交记录）、公告、Quiz、Modules 及其条目、Files 和 Calendar 所需的 GET 接口。即使应用仅执行只读查询，未限制 scopes 的 token 仍可能拥有更大的权限。

没有获批的 key 时，可以使用演示模式，或导入自己离线整理的规范化数据。Agent 必须如实说明这个前提，不能抓取浏览器会话凭据或创建宽泛权限来绕过它。

## 哪些步骤已经自动化？

- 自动发现自己的活跃课程，无需写死课程 ID。
- 分页查询 Assignments、Quizzes、Announcements、Modules、Files 元数据与 Calendar。
- 将 Canvas 时间转换为 Asia/Singapore 时区，并保留历史事项。
- 使用自己的提交记录，避免将全班提交标记误认为自己已经提交。
- 在 `.local/last-check.json` 中记录发生变化的栏目哈希与事件。
- 在需要时刷新 OAuth token，将凭据与个人数据排除在 Git 之外。
- 必要栏目查询失败时，保留上一份看板和基线。被禁用的 Quizzes 栏目（403/404）会明确标记为不可用，供浏览器补查。

## 哪些信息仍需核验？

- 仅在 PDF 中出现的截止时间、考试场地、评分占比、help-sheet 与开闭卷规则。
- API 未提供的固定课表、教学周与停课安排。
- 仅出现在公告正文中的安排：应用展示原文，不会自行从文字中猜测日期。
- 定时执行与自动部署：需要配置本机调度器，或经用户授权的 agent 自动任务。本仓库不会静默安装这些任务。

仓库附带的 agent skill 提供了核验流程。当前版本跟踪文件元数据，不会自动下载并 OCR 所有课件。Agent 应仅提取发生变化且相关的资料，并在本机缓存。可选脚本 `scripts/extract_pdf_text.py` 按 SHA-256 缓存文本并保留页码；需安装 `pypdf`，OCR 还需要 `pdftoppm` 和 `tesseract`。也可以使用 agent 自带的 PDF 工具。无法读取的页面会明确保留为未核验状态。不要将教师拥有版权的 PDF 上传到公开仓库。

## 给 AI / agent 的配置提示词

克隆仓库后，将下面的提示词粘贴给你的编程 agent：

```text
请为我的 Canvas 课程配置这个仓库。先阅读 AGENTS.md 和
skills/canvas-dashboard-setup/SKILL.md。安装依赖，并在连接账户前验证演示模式。
检查我是否有学校批准的 OAuth Developer Key；如果没有，请说明前提，
不要声称只登录就能接入。不要把凭据写入聊天、Git 或公开文件。
我会亲自完成登录、MFA 和 OAuth 授权。授权后执行只读同步，
核验发生变化的考核资料，并检查桌面端和手机端看板。
询问我的部署目标，包含真实课程信息的部署必须保持私有。
说明剩余手动步骤，并验证最终结果，不要只给出方案。
```

Codex 用户可以将 `skills/canvas-dashboard-setup` 复制到自己的 skill 目录；其他 agent 可以直接阅读其中的 `SKILL.md`。不要求使用特定 AI 厂商。

## 配置课表与已核验的课件信息

创建被 Git 忽略的 `data/overrides.local.json`：

```json
{
  "semester": "我的学期",
  "calendar": {"start":"2026-08-10","end":"2026-11-13","excludedDates":[],"breaks":[]},
  "meetings": [{"course":"YOUR_CODE","weekday":1,"start":"14:00","end":"16:00","venue":"自己的教室","weeks":"1–13"}],
  "events": []
}
```

课程代码使用 Canvas 实际返回的 `course_code`。`weekday` 中 0 为周日，6 为周六。课件明确说明的事项写入 `events`，包括稳定的 ID、type、title、date（未公布时为 null）、time、status、含文件名/页码/来源的 detail，以及 action。保留并明确展示来源冲突。支持的事件类型为 assignment、quiz、midterm、exam、announcement、material、academic。修改补充配置后重新执行同步。

## 部署与定时更新

```bash
npm test
npm run build
npm start
```

默认建议在本机运行。仓库附带 Dockerfile，供私有自托管使用：

```bash
docker build -t canvas-dashboard .
docker run --rm -p 127.0.0.1:3000:3000 canvas-dashboard
```

镜像包含看板数据快照，**不包含 OAuth 凭据**。含真实课程信息的镜像和构建产物应保持私有。在自己的设备之外开放访问前，需要配置有效的身份认证。仓库不包含原作者的托管站点标识。

成功执行 `npm run canvas:sync` 后，重新构建并部署到同一个私人实例。不要通过提交真实 `data/events.json` 来触发部署。直接从公开仓库进行 GitHub/Vercel 构建时，默认显示演示数据；真实快照需要通过 Git 之外的安全方式提供。OAuth 同步在可信的本机运行，当前版本未包含托管的回调服务或后台服务。

经你授权后，agent 可以配置每 48 小时执行一次的调度器。同步失败时，不能发布带有虚假最新时间的快照。本仓库的 GitHub Actions 仅检查演示数据，不访问 Canvas。

## 隐私与验证

- `.env.local`、`.local/`、真实事件和补充配置均被 Git 忽略。
- Git 历史仅包含脱敏 UI 代码与虚构示例。
- 未复制真实截图、学号、邮箱、课程 ID、成绩、PDF、缓存、托管标识或旧项目历史。
- `npm run privacy:check` 检查被跟踪的文件路径与已知个人信息/凭据模式。截图仍需人工查看；正则检查无法证明所有敏感内容都已排除。
- `npm test` 覆盖截止时间转换、个人提交状态语义与安全的 API 分页。
- OAuth 集成需要获批的真实 key，当前版本**尚未对真实学校 OAuth 应用完成端到端验证**。

## 许可证

MIT。无大学官方背书。使用时仍需遵守学校政策和 Canvas API 条款。
