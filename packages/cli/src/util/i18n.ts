import i18next from 'i18next'
import osLocale from 'os-locale'

export type Locale = 'zh-CN' | 'en-US'

// 获取系统语言
const getSystemLocale = (): Locale => {
  const lang = osLocale()
  if (lang.startsWith('zh-CN') || lang.startsWith('zh-CN')) {
    return 'zh-CN'
  }
  return 'en-US'
}

// 初始化 i18next
i18next.init({
  lng: getSystemLocale(),
  fallbackLng: 'en-US',
  debug: false,
  showSupportNotice: false,
  resources: {
    'en-US': {
      translation: {
        app: {
          name: 'Bacie CLI',
          description: 'A modern project scaffolding tool',
        },
        command: {
          create: {
            desc: 'Create a new project',
            projectName: 'Project name?',
            placeholder: 'my-project',
            invalidName: 'Please enter a valid project name',
            description: 'Enter project description',
            packageManager: 'Select package manager',
            templateSource: 'Select template source',
            template: 'Select template',
            gitInit: 'Initialize Git repository?',
            autoInstall: 'Auto install dependencies?',
            remoteRepo: 'Enter remote repository URL',
            invalidRepo: 'Please enter a valid Git repository URL',
          },
          pkg: {
            desc: 'Manage package.json',
            create: 'Create package.json',
            format: 'Format package.json',
            packageName: 'Package name?',
            packageNameRequired: 'Package name cannot be empty',
            packageNameInvalid:
              'Please enter a valid package name (lowercase letters, numbers, hyphens, underscores, dots, and @scope/)',
            version: 'Version?',
            versionRequired: 'Version cannot be empty',
            versionInvalid:
              'Please enter a valid version (format: x.y.z, e.g. 0.1.0)',
            description: 'Description?',
            preset: 'Select preset?',
            presetBasic: 'Basic project',
            presetLibrary: 'Library project',
          },
        },
        action: {
          overwrite: 'Overwrite',
          merge: 'Merge',
          cancel: 'Cancel',
          confirm: 'Confirm',
          back: 'Go Back',
          gitInit: 'Initialize Git',
          autoInstall: 'Auto install',
          defaultTemplate: 'Default template',
        },
        errors: {
          cancel: 'Operation cancelled',
          cancelDescription: 'Cancelled entering description',
          cancelNpm: 'Cancelled selecting package manager',
          cancelGitInput: 'Cancelled entering GitHub URL',
          cancelGitInit: 'Cancelled Git initialization',
          cancelGitRemote: 'Cancelled entering remote repository URL',
          cancelTemplateSource: 'Cancelled selecting template source',
          cancelTemplate: 'Cancelled selecting template',
          cancelAutoInstall: 'Cancelled auto install selection',
          createFailed: 'Failed to create project: {reason}',
          pkgFailed: 'Failed to process package.json: {reason}',
          templateNotFound: 'Template not found: {sourcePath}',
          invalidRepo: 'Please enter a valid repository URL',
          invalidGitRepo: 'Please enter a valid Git repository URL',
        },
        success: {
          created: '✓ Project created successfully',
          formatted: '✓ package.json formatted successfully',
          gitInitSuccess: 'Git initialization successful',
          gitRemoteSuccess: 'Remote repository linked successfully',
          installSuccess: 'Installation successful',
          downloadSuccess: 'Remote template downloaded successfully',
        },
        exists: {
          title: 'Directory already exists',
          message: '{dir} already exists. What to do?',
        },
        info: {
          userInterrupted: 'Detected user interruption, exiting...',
          cancelled: 'Cancelled',
          projectCreated: 'Project {projectName} created successfully!',
          getStarted: 'Enter {projectName} to start working!',
          fetchingTemplate: 'Fetching remote template...',
          downloadingTemplate: 'Downloading from {url}...',
          extractingTemplate: 'Extracting template...',
          installingDeps: 'Running {command} to install dependencies...',
          gitInit: 'Running {command}',
          linkingRemote: 'Linking remote {gitRemote}',
          gitRemoteFailed: 'Failed to link remote repository',
          gitInitFailed: 'Git initialization failed',
          installFailed: 'Installation failed, please install manually!',
          downloadFailed: 'Failed to fetch remote template!',
          invalidTemplateFormat: 'Invalid template source format',
          creatingFile: 'Creating file: {targetPath}',
        },
        templateSource: {
          githubLatest: 'GitHub (latest)',
          giteeFastest: 'Gitee (fastest)',
          builtin: 'CLI built-in templates',
          custom: 'Custom',
        },
      },
    },
    'zh-CN': {
      translation: {
        app: {
          name: 'Bacie CLI',
          description: '现代化项目脚手架工具',
        },
        command: {
          create: {
            desc: '创建新项目',
            projectName: '项目名称?',
            placeholder: 'my-project',
            invalidName: '请输入有效的项目名称',
            description: '请输入项目介绍',
            packageManager: '请选择包管理工具',
            templateSource: '请选择模板源',
            template: '请选择模板',
            gitInit: '是否需要初始化 Git 仓库?',
            autoInstall: '是否需要自动安装依赖?',
            remoteRepo:
              '请输入远程仓库地址 (例如: https://github.com/username/repo.git)',
            invalidRepo: '请输入有效的 Git 仓库地址',
          },
          pkg: {
            desc: '管理 package.json',
            create: '创建 package.json',
            format: '格式化 package.json',
            packageName: '包名 (package name)?',
            packageNameRequired: '包名不能为空',
            packageNameInvalid:
              '请输入有效的包名（只能包含小写字母、数字、连字符、下划线和点，可以包含 @scope/）',
            version: '版本号 (version)?',
            versionRequired: '版本号不能为空',
            versionInvalid: '请输入有效的版本号（格式: x.y.z，例如 0.1.0）',
            description: '包描述 (description)?',
            preset: '请选择预设类型 (preset)?',
            presetBasic: '基础项目 (basic)',
            presetLibrary: '库项目 (library)',
          },
        },
        action: {
          overwrite: '覆写',
          merge: '合并',
          cancel: '取消',
          confirm: '确认',
          back: '返回',
          gitInit: '初始化 Git',
          autoInstall: '自动安装',
          defaultTemplate: '默认模板',
        },
        errors: {
          cancel: '操作已取消',
          cancelDescription: '取消输入项目介绍',
          cancelNpm: '取消选择包管理工具',
          cancelGitInput: '取消输入 GitHub 地址',
          cancelGitInit: '取消选择 Git 初始化',
          cancelGitRemote: '取消输入远程仓库地址',
          cancelTemplateSource: '取消选择模板源',
          cancelTemplate: '取消选择模板',
          cancelAutoInstall: '取消选择自动安装',
          createFailed: '创建项目失败：{reason}',
          pkgFailed: '处理 package.json 失败：{reason}',
          templateNotFound: '找不到模板{sourcePath}',
          invalidRepo: '请输入有效的仓库地址',
          invalidGitRepo: '请输入有效的 Git 仓库地址',
        },
        success: {
          created: '✓ 项目创建成功',
          formatted: '✓ package.json 格式化成功',
          gitInitSuccess: 'Git 初始化成功',
          gitRemoteSuccess: '远程仓库关联成功',
          installSuccess: '安装成功',
          downloadSuccess: '拉取远程模板仓库成功！',
        },
        exists: {
          title: '目录已存在',
          message: '当前目录{dir}已经存在同名项目，是否覆写?',
        },
        info: {
          userInterrupted: '检测到用户中断，正在退出...',
          cancelled: '已取消创建',
          projectCreated: '创建项目 {projectName} 成功！',
          getStarted: '请进入项目目录 {projectName} 开始工作吧！',
          fetchingTemplate: '正在获取模板列表...',
          downloadingTemplate: '正在从 {url} 拉取远程模板...',
          extractingTemplate: '正在解压模板...',
          installingDeps: '执行安装项目依赖 {command}, 需要一会儿...',
          gitInit: '执行 {command}',
          linkingRemote: '关联远程仓库 {gitRemote}',
          gitRemoteFailed: '远程仓库关联失败',
          gitInitFailed: 'Git 初始化失败',
          installFailed: '安装项目依赖失败，请自行重新安装！',
          downloadFailed: '拉取远程模板仓库失败！',
          invalidTemplateFormat: '远程模板源组织格式错误',
          creatingFile: '创建文件: {targetPath}',
        },
        templateSource: {
          githubLatest: 'Github（最新）',
          giteeFastest: 'Gitee（最快）',
          builtin: 'CLI 内置默认模板',
          custom: '自定义',
        },
      },
    },
  },
})

// 便捷翻译函数
export const t: typeof i18next.t = i18next.t

// 设置语言
export const setLocale = (locale: Locale): void => {
  i18next.changeLanguage(locale)
}

// 获取当前语言
export const getLocale = (): Locale => {
  return i18next.language as Locale
}
