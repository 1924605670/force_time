# 将项目转为 App 的执行计划

当前项目 **已经是** 一个标准的 React Native App 项目。要将其作为 App 在手机上运行或发布，我们需要进行以下配置和操作：

## 1. 完善 App 配置 (app.json)
目前的配置是初始默认值，为了让它更像一个正式 App，我们需要修改 `app.json`：
- **修改 App 名称**：将 `fengrossment` 改为中文名 **“专注作业”**（手机桌面上显示的名字）。
- **添加唯一包名**：设置 `android.package` 和 `ios.bundleIdentifier`（例如 `com.fengrossment.app`）。这是手机识别 App 的身份证，**打包必填**。

## 2. 运行方案 A：真机预览（开发阶段推荐）
这是最快在手机上体验的方法，无需复杂的打包流程。
- **操作**：
    1. 手机下载 **Expo Go** 应用（App Store / Google Play）。
    2. 电脑运行 `npx expo start`（我会为您启动）。
    3. 手机扫描终端显示的二维码。
- **结果**：App 直接在手机上运行，支持热更新（改代码手机立马变）。

## 3. 运行方案 B：打包安装包（发布阶段）
如果您需要生成 `.apk` (Android) 或 `.ipa` (iOS) 文件发给家长安装，需要使用 Expo 的云构建服务（EAS）。
- **后续步骤（仅供参考）**：
    1. 安装工具：`npm install -g eas-cli`
    2. 登录账号：`eas login`
    3. 开始构建：`eas build -p android --profile preview`
*(注：本次计划主要聚焦于配置完善和方案 A 的验证，方案 B 涉及账号注册，我会提供指引)*

---

**待执行任务**：
1.  修改 `app.json`，配置中文名和包名。
2.  启动 Expo 开发服务器（支持手机扫码）。
