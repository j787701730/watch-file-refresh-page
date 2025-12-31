import { readFileSync } from 'fs';
import { networkInterfaces } from 'node:os';
import { join } from 'path';
import * as vscode from 'vscode';

/** 判断是数字 */
export const isNumber = (value: any): boolean => {
  return !isNaN(Number.parseFloat(value)) && isFinite(value);
};

/** 转成数字 */
export const toNumber = (str: any): number => {
  return isNumber(str) ? Number(str) : 0;
};

export const toArray = (data: any) => (Array.isArray(data) ? data : []);

/** 判断数据是不是对象类型 */
export const isObject = (data: any): boolean => {
  return data && `${Object.prototype.toString.call(data)}`.includes('Object');
};

export const toObject = (data: any): object => {
  return isObject(data) ? data : {};
};

export type IWatchFileConfig = {
  watchFileType?: string[];
  port?: number;
  localIp?: string;
};

/**
 * 读取工作区配置文件
 */
export async function loadWorkspaceConfig(): Promise<IWatchFileConfig> {
  // 获取当前工作区根目录（无工作区时返回 undefined）
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    // vscode.window.showInformationMessage('未检测到工作区，使用默认配置');
    return {};
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const configPath = join(workspaceRoot, 'watch-file-config.json');

  try {
    // 检查配置文件是否存在
    await vscode.workspace.fs.stat(vscode.Uri.file(configPath));
    // 读取配置文件内容
    const fileContent = readFileSync(configPath, 'utf8');
    const customConfig = toObject(JSON.parse(fileContent));
    return customConfig;
  } catch (error) {
    //
    console.log('wwww');
  }
  return {};
}

// 常见虚拟网卡的名称关键词（可根据实际情况补充）
const virtualKeywords = [
  'vmware', // VMware 虚拟机
  'virtual', // 通用虚拟网卡（如 VirtualBox）
  'docker', // Docker 虚拟网卡
  'wsl', // Windows Subsystem for Linux
  'hyper-v', // Hyper-V 虚拟机
  'vbox', // VirtualBox 缩写
  'bridge', // 桥接网卡（部分虚拟环境使用）
  'tun', // 隧道接口（如 VPN 虚拟网卡）
  'tap', // TAP 虚拟网卡
];

/** 获取本地ip */
export function getLocalIp() {
  const interfaces = networkInterfaces();

  for (const [ifaceName, ifaceDetails] of Object.entries(interfaces)) {
    // console.log(ifaceName);
    // console.log(ifaceDetails);

    // 检查接口名称是否包含虚拟网卡关键词（忽略大小写）
    const isVirtual = virtualKeywords.some((keyword) => ifaceName.toLowerCase().includes(keyword.toLowerCase()));

    if (isVirtual) {
      continue;
    } // 跳过虚拟网卡

    // console.log("ifaceDetails", ifaceDetails);

    for (const detail of ifaceDetails as any) {
      if (detail.family === 'IPv4' && !detail.internal) {
        return detail.address;
      }
    }
  }

  return '127.0.0.1'; // 若未找到，返回本地回环
}
