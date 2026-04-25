export const SUPPORTED_KERNEL_LANGUAGES = ['python', 'sql', 'shellscript', 'scala'] as const;

export type KernelLanguage = typeof SUPPORTED_KERNEL_LANGUAGES[number];

export interface KernelEnvironment {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly executionKind?: 'local' | 'databricks';
  readonly supportedLanguages: readonly KernelLanguage[];
  execute(language: KernelLanguage, code: string): Promise<string>;
  dispose(): void | Promise<void>;
}

export const normalizeKernelLanguage = (languageId: string): KernelLanguage | undefined => {
  switch (languageId.toLowerCase()) {
  case 'python':
    return 'python';
  case 'sql':
    return 'sql';
  case 'bash':
  case 'shell':
  case 'shellscript':
  case 'sh':
    return 'shellscript';
  case 'scala':
    return 'scala';
  default:
    return undefined;
  }
};

export const displayKernelLanguage = (language: KernelLanguage) => {
  switch (language) {
  case 'shellscript':
    return 'shell';
  default:
    return language;
  }
};
